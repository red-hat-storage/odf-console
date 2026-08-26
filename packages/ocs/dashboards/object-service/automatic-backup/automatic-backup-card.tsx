import * as React from 'react';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { getStorageClusterInNs } from '@odf/core/utils';
import {
  StorageClusterKind,
  StorageClusterModel,
  useCustomTranslation,
} from '@odf/shared';
import { OverviewDetailItem as DetailItem } from '@odf/shared/overview-page';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  DescriptionList,
} from '@patternfly/react-core';

const storageClusterResource = {
  kind: referenceForModel(StorageClusterModel),
  isList: true,
};

const AutomaticBackupCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { odfNamespace } = useODFNamespaceSelector();
  const [ocsData, ocsLoaded, ocsError] = useK8sWatchResource<
    StorageClusterKind[]
  >(storageClusterResource);

  const storageCluster: StorageClusterKind = getStorageClusterInNs(
    ocsData,
    odfNamespace
  );
  const dbBackup = storageCluster?.spec?.multiCloudGateway?.dbBackup;

  return (
    <Card className="odf-overview-card--gradient">
      <CardHeader>
        <CardTitle>{t('Automatic backup')}</CardTitle>
      </CardHeader>
      <CardBody>
        {!!dbBackup ? (
          <DescriptionList>
            <DetailItem
              key="backupFrequency"
              title={t('Backup frequency')}
              isLoading={!ocsLoaded}
              error={ocsError}
            >
              {dbBackup.schedule}
            </DetailItem>

            <DetailItem
              key="backupCopies"
              title={t('Number of backups to be retained')}
              isLoading={!ocsLoaded}
              error={ocsError}
            >
              {dbBackup.volumeSnapshot?.maxSnapshots}
            </DetailItem>
          </DescriptionList>
        ) : (
          <div className="text-secondary">{t('No automatic backup found')}</div>
        )}
      </CardBody>
    </Card>
  );
};

export default AutomaticBackupCard;
