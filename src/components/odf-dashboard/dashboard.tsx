import * as React from 'react';
import { HorizontalNav } from '@openshift-console/dynamic-plugin-sdk/api';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router';
import { Grid, GridItem } from '@patternfly/react-core';
import { ODFStorageSystemMock } from '../../models';
import PageHeading from '../common/heading/page-heading';
import ActivityCard from './activity-card/activity-card';
import ObjectCapacityCard from './object-storage-card/capacity-card';
import PerformanceCard from './performance-card/performance-card';
import { StatusCard } from './status-card/status-card';
import SystemCapacityCard from './system-capacity-card/capacity-card';
import '../../style.scss';

type ODFDashboardProps = {
  match: RouteComponentProps['match'];
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

export const ODFDashboard: React.FC<ODFDashboardProps> = () => {
  return (
    <>
      <div className="co-dashboard-body">
        <UpperSection />
      </div>
    </>
  );
};

const ODFDashboardPage: React.FC = () => {
  const { t } = useTranslation('plugin__odf-console');
  const title = t('OpenShift Data Foundation Overview');
  const pages = [
    {
      href: '',
      name: t('Overview'),
      component: ODFDashboard,
    },
  ];
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

export default ODFDashboardPage;
