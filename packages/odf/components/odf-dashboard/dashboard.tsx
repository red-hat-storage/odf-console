import * as React from 'react';
import {
  DashboardTab,
  DashboardTabExtensionProps as UnresolvedTabProps,
  isDashboardTab,
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
import { RouteComponentProps } from 'react-router';
import { useLocation } from 'react-router-dom';
import { Grid, GridItem } from '@patternfly/react-core';
import { ODFStorageSystemMock } from '../../models';
import { StorageSystemListPage } from '../system-list/odf-system-list';
import ActivityCard from './activity-card/activity-card';
import ObjectCapacityCard from './object-storage-card/capacity-card';
import PerformanceCard from './performance-card/performance-card';
import { StatusCard } from './status-card/status-card';
import SystemCapacityCard from './system-capacity-card/capacity-card';
import { convertDashboardTabToNav } from './utils';
import './dashboard.scss';

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
    },
    {
      id: 'systems',
      href: 'systems',
      name: t('Storage Systems'),
      component: StorageSystemListPage,
    },
  ]);

  const [extensions, isLoaded, error] =
    useResolvedExtensions<DashboardTab>(isDashboardTab);

  React.useEffect(() => {
    const updatedPages = [...pages];
    if (isLoaded && _.isEmpty(error)) {
      extensions.forEach((extension) => {
        const page: DashboardTabProps = {
          id: extension.properties.id,
          href: extension.properties.href,
          name: extension.properties.name,
          component: extension.properties.component,
        };
        const indexId =
          extension.properties.before || extension.properties.after;
        let pushLocation = updatedPages.findIndex((pg) => pg.id === indexId);
        if (extension.properties.before && updatedPages.length > 0) {
          pushLocation -= 1;
        }
        if (updatedPages.length > 0) {
          updatedPages.splice(pushLocation, 0, page);
        } else {
          updatedPages.push(page);
        }
      });
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

export default ODFDashboardPage;
