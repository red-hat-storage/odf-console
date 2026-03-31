import * as React from 'react';
import { GeneralOverviewActivityCard } from '@odf/core/components/overview/activity-card/GeneralOverviewActivityCard';
import { ExternalSystemsCard } from '@odf/core/components/overview/external-systems-card/ExternalSystemsCard';
import { ObjectStorageCard } from '@odf/core/components/overview/object-storage-card/ObjectStorageCard';
import { StorageClusterCard } from '@odf/core/components/overview/storage-cluster-card/StorageClusterCard';
import { StorageClusterCreateModal } from '@odf/core/modals/ConfigureDF/StorageClusterCreateModal';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom-v5-compat';
import { Grid, GridItem } from '@patternfly/react-core';
import { HealthOverviewCard } from './health-overview-card/HealthOverviewCard';
import './Overview.scss';

const Overview: React.FC = () => {
  const { t } = useCustomTranslation();
  const title = t('Overview');

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const showWelcomeModal = searchParams.get('show-welcome-modal');
  const launchModal = useModal();

  React.useEffect(() => {
    if (showWelcomeModal === 'true') {
      launchModal(StorageClusterCreateModal, { isOpen: true });
    }
  }, [showWelcomeModal, launchModal]);

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
          <HealthOverviewCard />
        </GridItem>
        <GridItem xl2={4} xl2RowSpan={3} order={{ '2xl': '0', default: '3' }}>
          <GeneralOverviewActivityCard />
        </GridItem>
        <GridItem xl2={3}>
          <ExternalSystemsCard />
        </GridItem>
        <GridItem xl2={5}>
          <ObjectStorageCard />
        </GridItem>
      </Grid>
    </>
  );
};

export default Overview;
