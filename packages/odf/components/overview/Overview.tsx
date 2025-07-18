import * as React from 'react';
import { GeneralOverviewActivityCard } from '@odf/core/components/overview/activity-card/GeneralOverviewActivityCard';
import { ExternalSystemsCard } from '@odf/core/components/overview/external-systems-card/ExternalSystemsCard';
import { ObjectStorageCard } from '@odf/core/components/overview/object-storage-card/ObjectStorageCard';
import { StorageClusterCard } from '@odf/core/components/overview/storage-cluster-card/StorageClusterCard';
import { FDF_FLAG } from '@odf/core/redux/provider-hooks';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { Helmet } from 'react-helmet';
import { Grid, GridItem } from '@patternfly/react-core';
import './Overview.scss';

const Overview: React.FC = () => {
  const { t } = useCustomTranslation();
  const isFDF = useFlag(FDF_FLAG);

  const title = t('Overview');
  const storageCard2xlColumns = isFDF ? 5 : 8;

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeading title={title} hasUnderline={false} />
      <Grid hasGutter className="odf-general-overview__grid">
        <GridItem xl2={storageCard2xlColumns}>
          <StorageClusterCard />
        </GridItem>
        {isFDF && (
          <GridItem xl2={3}>
            <ExternalSystemsCard />
          </GridItem>
        )}
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
