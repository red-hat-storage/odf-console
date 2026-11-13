import * as React from 'react';
import { GeneralOverviewActivityCard } from '@odf/core/components/overview/activity-card/GeneralOverviewActivityCard';
import { ExternalSystemsCard } from '@odf/core/components/overview/external-systems-card/ExternalSystemsCard';
import { ObjectStorageCard } from '@odf/core/components/overview/object-storage-card/ObjectStorageCard';
import { StorageClusterCard } from '@odf/core/components/overview/storage-cluster-card/StorageClusterCard';
import { StorageClusterCreateModal } from '@odf/core/modals/ConfigureDF/StorageClusterCreateModal';
import { FDF_FLAG } from '@odf/core/redux';
import {
  useODFNamespaceSelector,
  useODFSystemFlagsSelector,
} from '@odf/core/redux/selectors';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import { useModalWrapper } from '@odf/shared';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router';
import { Grid, GridItem } from '@patternfly/react-core';
import { hasAnyInternalCeph } from '../../utils';
import { HealthOverviewCard } from './health-overview-card/HealthOverviewCard';
import './Overview.scss';

const Overview: React.FC = () => {
  const { t } = useCustomTranslation();
  const title = t('Overview');

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const showWelcomeModal = searchParams.get('show-welcome-modal');
  const launchModal = useModalWrapper();

  // Show health card only for internal Ceph clusters.
  // Can't use hasAnyInternalOCS because MCG standalone is also internal mode,
  // but it has no Ceph, so ocs_health_score metric won't exist.
  // Also hide it on FDF: the ocs_health_score metric is ODF-only, so the card
  // would otherwise hang on "Waiting for health checks".
  const isFDF = useFlag(FDF_FLAG);
  const { isNsSafe } = useODFNamespaceSelector();
  const { systemFlags, areFlagsSafe } = useODFSystemFlagsSelector();
  // Only show the card once namespace/provider detection has completed and we
  // know this is a non-FDF cluster. The FDF flag is undefined until detection
  // resolves, so check `isFDF === false` (not `!isFDF`) to avoid flashing the
  // card on an FDF cluster while detection is still in flight.
  const showHealthCard =
    isNsSafe &&
    isFDF === false &&
    areFlagsSafe &&
    hasAnyInternalCeph(systemFlags);

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
        {/*
          The tall Activity card must always occupy the right-most column while
          the other cards flow into the left 8 columns. Because it row-spans and
          CSS grid packs sparsely, its position is controlled by `order` so that
          exactly the cards that belong on its left are placed before it:
          Storage + Health when the Health card is shown, Storage + External
          when it is hidden. External is therefore ordered before Activity only
          when the Health card is absent.
        */}
        <GridItem xl2={5}>
          <StorageClusterCard />
        </GridItem>
        {showHealthCard && (
          <GridItem xl2={3}>
            <HealthOverviewCard />
          </GridItem>
        )}
        <GridItem xl2={4} xl2RowSpan={3} order={{ '2xl': '2', default: '3' }}>
          <GeneralOverviewActivityCard />
        </GridItem>
        <GridItem xl2={3} order={{ '2xl': showHealthCard ? '3' : '1' }}>
          <ExternalSystemsCard />
        </GridItem>
        <GridItem xl2={5} order={{ '2xl': '4' }}>
          <ObjectStorageCard />
        </GridItem>
      </Grid>
    </>
  );
};

export default Overview;
