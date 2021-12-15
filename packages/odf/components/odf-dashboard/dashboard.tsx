import * as React from 'react';
import PageHeading from '@odf/shared/heading/page-heading';
import { HorizontalNav } from '@openshift-console/dynamic-plugin-sdk';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps, match as Match } from 'react-router';
import { useLocation } from 'react-router-dom';
import { Grid, GridItem } from '@patternfly/react-core';
import { ODFStorageSystemMock } from '../../models';
import StorageSystemListPage from '../system-list/odf-system-list';
import ActivityCard from './activity-card/activity-card';
import ObjectCapacityCard from './object-storage-card/capacity-card';
import PerformanceCard from './performance-card/performance-card';
import { StatusCard } from './status-card/status-card';
import SystemCapacityCard from './system-capacity-card/capacity-card';
import '../../style.scss';

type ODFDashboardPageProps = {
  history: RouteComponentProps['history'];
};

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
      <div className="co-dashboard-body">
        <UpperSection />
      </div>
    </>
  );
};

const ODFDashboardPage: React.FC<ODFDashboardPageProps> = (props) => {
  const { t } = useTranslation('plugin__odf-console');
  const title = t('OpenShift Data Foundation');
  const pages = [
    {
      href: '',
      name: t('Overview'),
      component: ODFDashboard,
    },
    {
      href: 'systems',
      name: t('Storage Systems'),
      component: StorageSystemListPage,
    },
  ];
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
      <HorizontalNav
        pages={pages}
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
