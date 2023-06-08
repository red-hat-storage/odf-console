import * as React from 'react';
import {
  HorizontalNavTab,
  HorizontalNavTabExtensionProps as UnresolvedTabProps,
  isHorizontalNavTab,
} from '@odf/odf-plugin-sdk/extensions';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  HorizontalNav,
  useResolvedExtensions,
} from '@openshift-console/dynamic-plugin-sdk';
import { ResolvedCodeRefProperties } from '@openshift-console/dynamic-plugin-sdk/lib/types';
import * as _ from 'lodash-es';
import { Helmet } from 'react-helmet';
import { RouteComponentProps, match as Match } from 'react-router';
import { useLocation } from 'react-router-dom';
import { Grid, GridItem } from '@patternfly/react-core';
import { ODFStorageSystemMock } from '../../models';
import { StorageSystemListPage } from '../system-list/odf-system-list';
import ActivityCard from './activity-card/activity-card';
import ObjectCapacityCard from './object-storage-card/capacity-card';
import PerformanceCard from './performance-card/performance-card';
import { StatusCard } from './status-card/status-card';
import SystemCapacityCard from './system-capacity-card/capacity-card';
import { convertDashboardTabToNav, sortPages } from './utils';
import './dashboard.scss';

const CONTEXT_ID = 'odf-dashboard';

type ODFDashboardPageProps = {
  history: RouteComponentProps['history'];
};

type DashboardTabProps = ResolvedCodeRefProperties<UnresolvedTabProps>;

const UpperSection: React.FC = () => (
  <Grid hasGutter>
    <GridItem md={8} sm={12}>
      <StatusCard />
    </GridItem>
    <GridItem md={4} rowSpan={2} sm={12}>
      <ActivityCard />
    </GridItem>
    <GridItem md={4} sm={12}>
      <SystemCapacityCard />
    </GridItem>
    <GridItem md={4} sm={12}>
      <ObjectCapacityCard />
    </GridItem>
    <GridItem md={12} sm={12}>
      <PerformanceCard />
    </GridItem>
  </Grid>
);

export const ODFDashboard: React.FC = () => {
  return (
    <>
      <div className="odf-dashboard-body">
        <UpperSection />
      </div>
    </>
  );
};

const ODFDashboardPage: React.FC<ODFDashboardPageProps> = (props) => {
  const { t } = useCustomTranslation();
  const title = t('Data Foundation');
  const [pages, setPages] = React.useState<DashboardTabProps[]>([
    {
      id: 'overview',
      href: '',
      name: t('Overview'),
      component: ODFDashboard,
      contextId: CONTEXT_ID,
    },
    {
      id: 'systems',
      href: 'systems',
      name: t('Storage Systems'),
      component: StorageSystemListPage,
      contextId: CONTEXT_ID,
    },
  ]);

  const isTab = React.useMemo(() => isHorizontalNavTab(CONTEXT_ID), []);

  const [extensions, isLoaded, error] =
    useResolvedExtensions<HorizontalNavTab>(isTab);

  React.useEffect(() => {
    const updatedPages = [...pages];
    if (isLoaded && _.isEmpty(error)) {
      extensions.forEach((extension) => {
        const alreadyAdded =
          updatedPages.findIndex((pg) => pg.id === extension.properties.id) >=
          0;
        if (alreadyAdded) {
          return;
        } else {
          const page: DashboardTabProps = {
            id: extension.properties.id,
            href: extension.properties.href,
            name: extension.properties.name,
            component: extension.properties.component,
            contextId: extension.properties.contextId,
            before: extension.properties.before,
            after: extension.properties.after,
          };
          updatedPages.push(page);
        }
      });
      sortPages(updatedPages);
      if (!_.isEqual(updatedPages, pages)) {
        setPages(updatedPages);
      }
    }
  }, [extensions, isLoaded, error, pages, setPages]);

  const { history } = props;
  const location = useLocation();

  React.useEffect(() => {
    if (location.pathname.endsWith('/odf/systems')) {
      history.push(`/odf/cluster/systems`);
    }
  }, [location, history]);

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeading title={title} />
      {/** Todo(bipuladh): Move to usage of common PF Tabs component */}
      <HorizontalNav
        pages={convertDashboardTabToNav(pages)}
        resource={{
          kind: ODFStorageSystemMock.kind,
          apiVersion: `${ODFStorageSystemMock.apiGroup}/${ODFStorageSystemMock.apiVersion}`,
        }}
      />
    </>
  );
};

/**
 * To support legacy /odf routes.
 * Todo(fix): Remove from console in 4.10.
 */
export const Reroute: React.FC<ODFDashboardPageProps> = ({ history }) => {
  React.useEffect(() => {
    history.push(`/odf/cluster`);
  }, [history]);

  return null;
};

type ReRouteResourceProps = {
  history: RouteComponentProps['history'];
  match: Match<{ kind: string }>;
};

/**
 * To support legacy /odf/resource/:kind Routes
 * Todo(fix): Remove from console in 4.10.
 */
export const RerouteResource: React.FC<ReRouteResourceProps> = ({
  match,
  history,
}) => {
  React.useEffect(() => {
    history.push(`/odf/cluster/resource/${match.params.kind}`);
  }, [history, match]);
  return null;
};

export default ODFDashboardPage;
