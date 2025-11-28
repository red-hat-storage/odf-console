import * as React from 'react';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import { Overview } from '@openshift-console/dynamic-plugin-sdk';
import { Grid, GridItem } from '@patternfly/react-core';
import ActivityCard from '../ibm-common/ActivityCard';
import CapacityCard from '../ibm-common/CapacityCard';
import LUNCard from './LUNCard';
import StatusCard from './StatusCard';

const SANDashboard: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <>
      <PageHeading
        title={t('Scale Dashboard')}
        hasUnderline={false}
        breadcrumbs={[
          {
            name: t('External systems'),
            path: '/odf/external-systems',
          },
          {
            name: t('IBM SAN'),
            path: '',
          },
        ]}
      />
      <Overview>
        <Grid hasGutter>
          <GridItem span={8}>
            <StatusCard />
          </GridItem>
          <GridItem span={4} rowSpan={3}>
            <ActivityCard />
          </GridItem>
          <GridItem span={8}>
            <CapacityCard />
          </GridItem>
          <GridItem span={8}>
            <LUNCard />
          </GridItem>
        </Grid>
      </Overview>
    </>
  );
};

export default SANDashboard;
