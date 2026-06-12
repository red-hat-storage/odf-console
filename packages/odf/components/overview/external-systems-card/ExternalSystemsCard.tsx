import * as React from 'react';
import { FDF_FLAG } from '@odf/core/redux';
import { FileSystemKind } from '@odf/core/types/scale';
import { isClusterIgnored, isExternalCluster } from '@odf/core/utils/odf';
import { useWatchStorageClusters } from '@odf/shared/hooks/useWatchStorageClusters';
import { FileSystemModel } from '@odf/shared/models/scale';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getValidWatchK8sResourceObj,
  referenceForModel,
} from '@odf/shared/utils';
import {
  K8sResourceKind,
  useFlag,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Button,
  ButtonVariant,
  Card,
  CardBody,
  CardHeader,
  CardProps,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Skeleton,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';
import {
  filterCnsaFileSystems,
  filterSANFileSystems,
} from '../../ibm-common/utils';
import {
  ExternalSystemStatusCounts,
  getClusterStatusCounts,
  getCnsaFilesystemStatusCounts,
  getSanLunGroupStatusCounts,
  ExternalSystemStatusStripOrEmpty,
} from './external-systems-status';
import './ExternalSystemsCard.scss';

type ExternalSystemRow = {
  id: string;
  label: string;
  counts: ExternalSystemStatusCounts;
};

type ExternalSystemsListBodyProps = {
  rows: ExternalSystemRow[];
  emptyMessage: string;
};

const ExternalSystemsListBody: React.FC<ExternalSystemsListBodyProps> = ({
  rows,
  emptyMessage,
}) => {
  if (rows.length > 0) {
    return (
      <>
        {rows.map((row) => (
          <DescriptionListGroup key={row.id}>
            <DescriptionListTerm>{row.label}</DescriptionListTerm>
            <DescriptionListDescription>
              <ExternalSystemStatusStripOrEmpty
                counts={row.counts}
                emptyMessage={emptyMessage}
              />
            </DescriptionListDescription>
          </DescriptionListGroup>
        ))}
      </>
    );
  }

  return (
    <DescriptionListGroup>
      <DescriptionListDescription>
        <span className="pf-v6-u-disabled-color-100">{emptyMessage}</span>
      </DescriptionListDescription>
    </DescriptionListGroup>
  );
};

export const ExternalSystemsCard: React.FC<CardProps> = ({ className }) => {
  const { t } = useCustomTranslation();
  const { storageClusters, flashSystemClusters, remoteClusters, sanClusters } =
    useWatchStorageClusters();
  const navigate = useNavigate();

  const isFDF = useFlag(FDF_FLAG);

  const [fileSystems, fileSystemsLoaded, fileSystemsLoadError] =
    useK8sWatchResource<FileSystemKind[]>(
      getValidWatchK8sResourceObj(
        {
          kind: referenceForModel(FileSystemModel),
          isList: true,
          namespaced: false,
        },
        isFDF
      )
    );

  const externalCephClusters =
    storageClusters?.loaded && !storageClusters?.loadError
      ? (storageClusters.data?.filter(
          (cluster) => !isClusterIgnored(cluster) && isExternalCluster(cluster)
        ) ?? [])
      : [];

  const flashClusters =
    flashSystemClusters?.loaded && !flashSystemClusters?.loadError
      ? (flashSystemClusters.data ?? [])
      : [];

  const remoteClustersData = remoteClusters?.data ?? [];
  const sanClustersData = sanClusters?.data ?? [];

  const scaleResourcesLoaded =
    !isFDF ||
    (Boolean(remoteClusters?.loaded) &&
      !remoteClusters?.loadError &&
      Boolean(sanClusters?.loaded) &&
      !sanClusters?.loadError &&
      fileSystemsLoaded &&
      !fileSystemsLoadError);

  const isCnsaConnected = isFDF && remoteClustersData.length > 0;
  const isSanConnected =
    isFDF && !isCnsaConnected && sanClustersData.length > 0;

  const cnsaFileSystems = filterCnsaFileSystems(fileSystems ?? []);
  const sanLunGroups = filterSANFileSystems(fileSystems ?? []);

  const connectedRows: ExternalSystemRow[] = [];

  if (isFDF && scaleResourcesLoaded) {
    if (isCnsaConnected) {
      connectedRows.push({
        id: 'cnsa',
        label: t('IBM Scale (CNSA) file systems'),
        counts: getCnsaFilesystemStatusCounts(cnsaFileSystems),
      });
    } else if (isSanConnected) {
      connectedRows.push({
        id: 'san',
        label: t('Storage Area Network LUN groups'),
        counts: getSanLunGroupStatusCounts(sanLunGroups),
      });
    }
  }

  if (
    flashSystemClusters?.loaded &&
    !flashSystemClusters?.loadError &&
    flashClusters.length > 0
  ) {
    connectedRows.push({
      id: 'flash',
      label: t('IBM FlashSystem clusters'),
      counts: getClusterStatusCounts(flashClusters as K8sResourceKind[]),
    });
  }

  if (
    storageClusters?.loaded &&
    !storageClusters?.loadError &&
    externalCephClusters.length > 0
  ) {
    connectedRows.push({
      id: 'ceph',
      label: t('Red Hat Ceph clusters'),
      counts: getClusterStatusCounts(externalCephClusters as K8sResourceKind[]),
    });
  }

  const rows = connectedRows.sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  );

  const emptyMessage = t('No external systems connected');
  const isListLoaded =
    scaleResourcesLoaded ||
    (storageClusters?.loaded && flashSystemClusters?.loaded);

  return (
    <Card className={classNames(className, 'odf-external-system-card')}>
      <CardHeader>
        <CardTitle>{t('External systems')}</CardTitle>
      </CardHeader>
      <CardBody>
        {isListLoaded && (
          <Stack>
            <StackItem>
              <DescriptionList>
                <ExternalSystemsListBody
                  rows={rows}
                  emptyMessage={emptyMessage}
                />
              </DescriptionList>
            </StackItem>
            <StackItem isFilled></StackItem>
            <StackItem>
              <Button
                variant={ButtonVariant.link}
                icon={<ArrowRightIcon />}
                iconPosition="end"
                className="pf-v6-u-font-size-lg odf-cluster-card__storage-link"
                onClick={() => navigate('/odf/external-systems')}
              >
                {t('View external systems')}
              </Button>
            </StackItem>
          </Stack>
        )}
        {!isListLoaded && (
          <Skeleton
            height="100%"
            screenreaderText={t('Loading external systems data')}
          />
        )}
      </CardBody>
    </Card>
  );
};
