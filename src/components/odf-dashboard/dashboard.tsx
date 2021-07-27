import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import { Helmet } from 'react-helmet';
import { Grid, GridItem } from '@patternfly/react-core';
import { HorizontalNav, NavPage } from 'badhikar-dynamic-plugin-sdk/api';
import { StatusCard } from './status-card/status-card';
import ActivityCard from './activity-card/activity-card';
import SystemCapacityCard from './system-capacity-card/capacity-card';
import PerformanceCard from './performance-card/performance-card';
import ObjectCapacityCard from './object-storage-card/capacity-card';
import PageHeading from '../common/heading/page-heading';
import { ODFStorageSystem } from '../../models';
import '../../style.scss';

type UpperSectionProps = {
  currentLocation: string;
};

type ODFDashboardProps = {
  match: RouteComponentProps['match'];
};

const UpperSection: React.FC<UpperSectionProps> = (props) => (
  <Grid hasGutter>
    <GridItem span={8}>
      <StatusCard />
    </GridItem>
    <GridItem span={4} rowSpan={2}>
      <ActivityCard />
    </GridItem>
    <GridItem span={4}>
      <SystemCapacityCard />
    </GridItem>
    <GridItem span={4}>
      <ObjectCapacityCard />
    </GridItem>
    <GridItem span={12}>
      <PerformanceCard {...props} />
    </GridItem>
  </Grid>
);

export const ODFDashboard: React.FC<ODFDashboardProps> = (props) => {
  const currentLocation = props.match.path;
  return (
    <>
      <div className="co-dashboard-body">
        <UpperSection currentLocation={currentLocation} />
      </div>
    </>
  );
};

const ODFDashboardPage: React.FC<any> = ({ match }) => {
  const title = 'OpenShift Data Foundation Overview';
  const pages: NavPage[] = [
    {
      href: '',
      name: 'Overview',
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
        match={match}
        obj={{
          data: {
            kind: ODFStorageSystem.kind,
            apiVersion: `${ODFStorageSystem.apiGroup}/${ODFStorageSystem.apiVersion}`,
          },
          loaded: true,
        }}
        noStatusBox
      />
    </>
  );
};

export default ODFDashboardPage;
