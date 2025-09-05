import * as React from 'react';
import { GeneralOverviewActivityCard } from '@odf/core/components/overview/activity-card/GeneralOverviewActivityCard';
import { ExternalSystemsCard } from '@odf/core/components/overview/external-systems-card/ExternalSystemsCard';
import { ObjectStorageCard } from '@odf/core/components/overview/object-storage-card/ObjectStorageCard';
import { StorageClusterCard } from '@odf/core/components/overview/storage-cluster-card/StorageClusterCard';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import { Helmet } from 'react-helmet';
import { Grid, GridItem } from '@patternfly/react-core';
import './Overview.scss';

const Overview: React.FC = () => {
  const { t } = useCustomTranslation();
  const title = t('Overview');

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeading title={title} hasUnderline={false} />
      <Grid hasGutter className="odf-general-overview__grid">
        <GridItem xl2={5}>
          <StorageClusterCard />
        </GridItem>
        <GridItem xl2={3}>
          <ExternalSystemsCard />
        </GridItem>
        <GridItem xl2={4} xl2RowSpan={3} order={{ '2xl': '0', default: '3' }}>
          <GeneralOverviewActivityCard />
        </GridItem>
        <GridItem xl2={8}>
          <ObjectStorageCard />
        </GridItem>
      </Grid>
    </>
  );
};

export default Overview;
