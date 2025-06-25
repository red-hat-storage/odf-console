import * as React from 'react';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction, Trans } from 'react-i18next';
import { useLocation } from 'react-router-dom-v5-compat';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
} from '@patternfly/react-core';
import { StorageDomainIcon } from '@patternfly/react-icons';
import { StorageClusterCreateModal } from '../../../modals/ConfigureDF/EmptyStateCreateModal';

const getPageTitle = (path: string, t: TFunction) => {
  if (path.includes('storage-cluster')) {
    return t('Storage cluster');
  }
  return t('Object storage');
};

const EmptyStateBodyObjectPage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Trans t={t}>
      To access Object Storage, you can either configure the storage
      cluster(provider block, file and object) or deploy MCG only(for Object
      storage without block and file)
    </Trans>
  );
};

const EmptyStateBodyStorageClusterPage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Trans t={t}>
      Provision a storage cluster using local devices on your OpenShift nodes.
      Data Foundation with block, shared filesystem and object services
    </Trans>
  );
};

const EmptyStatePageBody: React.FC = () => {
  const location = useLocation();
  return location.pathname.includes('storage-cluster') ? (
    <EmptyStateBodyStorageClusterPage />
  ) : (
    <EmptyStateBodyObjectPage />
  );
};

const InitialEmptyStatePage: React.FC = () => {
  const { t } = useCustomTranslation();
  const location = useLocation();
  const launchModal = useModal();

  return (
    <>
      <PageHeading title={getPageTitle(location.pathname, t)} />
      <EmptyState>
        <EmptyStateHeader
          titleText={t('Storage cluster is not configured')}
          headingLevel="h4"
          icon={<EmptyStateIcon icon={StorageDomainIcon} />}
        />
        <EmptyStateBody>
          <EmptyStatePageBody />
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button
              variant="primary"
              onClick={() => {
                launchModal(StorageClusterCreateModal, {});
              }}
            >
              {t('Create storage cluster')}
            </Button>
          </EmptyStateActions>
          <EmptyStateActions>
            <Button
              variant="link"
              onClick={() => {
                return null;
              }}
            >
              {t('How to setup storage cluster')}
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </>
  );
};

export default InitialEmptyStatePage;
