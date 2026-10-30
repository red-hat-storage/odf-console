import * as React from 'react';
import { CronTime, getCronTimeFromSchedule } from '@odf/core/constants';
import { useGetClusterDetails } from '@odf/core/redux/utils';
import { getStorageClusterInNs } from '@odf/core/utils';
import {
  StorageClusterKind,
  StorageClusterModel,
  useCustomTranslation,
} from '@odf/shared';
import { OverviewDetailItem as DetailItem } from '@odf/shared/overview-page';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  DescriptionList,
} from '@patternfly/react-core';

const getReadableSchedule = (schedule: string, t: TFunction): string => {
  switch (getCronTimeFromSchedule(schedule)) {
    case CronTime.DAILY:
      return t('Daily');
    case CronTime.WEEKLY:
      return t('Weekly');
    case CronTime.MONTHLY:
      return t('Monthly');
    default:
      return schedule;
  }
};

const storageClusterResource = {
  kind: referenceForModel(StorageClusterModel),
  isList: true,
};

const AutomaticBackupCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { clusterNamespace: clusterNs } = useGetClusterDetails();
  const [ocsData, ocsLoaded, ocsError] = useK8sWatchResource<
    StorageClusterKind[]
  >(storageClusterResource);

  const storageCluster: StorageClusterKind = getStorageClusterInNs(
    ocsData,
    clusterNs
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
              {getReadableSchedule(dbBackup.schedule, t)}
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
