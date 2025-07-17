import * as React from 'react';
import { StorageClusterCreateModal } from '@odf/core/modals/ConfigureDF/StorageClusterCreateModal';
import { getModalStartPoint } from '@odf/core/modals/ConfigureDF/util';
import { StartingPoint } from '@odf/core/types/install-ui';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { Helmet } from 'react-helmet';
import { TFunction, Trans } from 'react-i18next';
import { useLocation } from 'react-router-dom-v5-compat';
import {
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
} from '@patternfly/react-core';
import { StorageDomainIcon } from '@patternfly/react-icons';

const getPageTitle = (path: string, t: TFunction) => {
  if (path.includes(StartingPoint.STORAGE_CLUSTER)) {
    return t('Storage cluster');
  }
  if (path.includes(StartingPoint.OBJECT_STORAGE)) {
    return t('Object storage');
  }
  if (path.includes(StartingPoint.EXTERNAL_SYSTEM)) {
    return t('External system');
  }
  if (path.includes(StartingPoint.OVERVIEW)) {
    return t('Overview');
  }
  return t('Storage cluster');
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

const EmptyStateBodyOverviewPage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Trans t={t}>
      Start configuring your storage platform to unlock core Data Foundation
      features.
    </Trans>
  );
};

const EmptyStateBodyExternalSystemPage: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Trans t={t}>
      Configure an external system to connect to Data Foundation
    </Trans>
  );
};

const EmptyStatePageBody: React.FC = () => {
  const location = useLocation();
  const startingPoint = getModalStartPoint(location.pathname);
  switch (startingPoint) {
    case StartingPoint.OVERVIEW:
      return <EmptyStateBodyOverviewPage />;
    case StartingPoint.STORAGE_CLUSTER:
      return <EmptyStateBodyStorageClusterPage />;
    case StartingPoint.OBJECT_STORAGE:
      return <EmptyStateBodyObjectPage />;
    case StartingPoint.EXTERNAL_SYSTEM:
      return <EmptyStateBodyExternalSystemPage />;
    default:
      return <EmptyStateBodyOverviewPage />;
  }
};

const InitialEmptyStatePage: React.FC = () => {
  const { t } = useCustomTranslation();
  const location = useLocation();
  const launchModal = useModal();
  const title = getPageTitle(location.pathname, t);

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeading title={title} />
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
              variant={ButtonVariant.primary}
              onClick={() => {
                launchModal(StorageClusterCreateModal, {});
              }}
            >
              {t('Configure Data Foundation')}
            </Button>
          </EmptyStateActions>
          <EmptyStateActions>
            <Button
              variant={ButtonVariant.link}
              onClick={() => {
                return null;
              }}
            >
              {t('Documentation link')}
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </>
  );
};

export default InitialEmptyStatePage;
