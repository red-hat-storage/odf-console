import * as React from 'react';
import { ExternalSystemsSelectModal } from '@odf/core/modals/ConfigureDF/ExternalSystemsModal';
import { StorageClusterCreateModal } from '@odf/core/modals/ConfigureDF/StorageClusterCreateModal';
import { getModalStartPoint } from '@odf/core/modals/ConfigureDF/util';
import { StartingPoint } from '@odf/core/types/install-ui';
import {
  externalSystemsDoc,
  PageHeading,
  useCustomTranslation,
  odfDeployExternalMode,
} from '@odf/shared';
import { DOC_VERSION } from '@odf/shared/hooks/use-doc-version';
import { ViewDocumentation } from '@odf/shared/utils';
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
import { CubesIcon, StorageDomainIcon } from '@patternfly/react-icons';

const getPageTitle = (path: string, t: TFunction) => {
  if (path.includes(StartingPoint.STORAGE_CLUSTER)) {
    return t('Storage cluster');
  }
  if (path.includes(StartingPoint.OBJECT_STORAGE)) {
    return t('Object storage');
  }
  if (path.includes(StartingPoint.EXTERNAL_SYSTEMS)) {
    return t('External systems');
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
      Connect an external storage system to get started. Add{' '}
      <span className="pf-v5-u-font-weight-bold">
        IBM FlashSystem, IBM Scale or Red Hat Ceph Storage{' '}
      </span>{' '}
      to begin managing it.
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
    case StartingPoint.EXTERNAL_SYSTEMS:
      return <EmptyStateBodyExternalSystemPage />;
    default:
      return <EmptyStateBodyOverviewPage />;
  }
};

const ExternalSystemsEmptyState: React.FC = () => {
  const { t } = useCustomTranslation();
  const launchModal = useModal();
  return (
    <EmptyState>
      <EmptyStateHeader
        titleText={t('No external systems connected')}
        headingLevel="h4"
        icon={<EmptyStateIcon icon={CubesIcon} />}
      />
      <EmptyStateBody>
        <EmptyStatePageBody />
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button
            data-test="configure-external-systems"
            variant={ButtonVariant.primary}
            onClick={() => {
              launchModal(ExternalSystemsSelectModal, {});
            }}
          >
            {t('Connect external systems')}
          </Button>
        </EmptyStateActions>
        <EmptyStateActions>
          <ViewDocumentation
            doclink={externalSystemsDoc(DOC_VERSION)}
            text={t('Explore all supported external systems')}
          />
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );
};
const InitialEmptyStatePage: React.FC = () => {
  const { t } = useCustomTranslation();
  const location = useLocation();
  const path = location.pathname;
  const title = getPageTitle(path, t);
  const launchModal = useModal();
  const isExternalSystems = path.includes(StartingPoint.EXTERNAL_SYSTEMS);

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeading title={title} />
      {!!isExternalSystems ? (
        <ExternalSystemsEmptyState />
      ) : (
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
                data-test="configure-data-foundation"
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
                component={'a'}
                href={odfDeployExternalMode(DOC_VERSION)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('Documentation link')}
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      )}
    </>
  );
};

export default InitialEmptyStatePage;
