import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  HealthState,
  WatchK8sResource,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  HealthBody,
  HealthItem,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import * as _ from 'lodash-es';
import {
  GalleryItem,
  Gallery,
  Card,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { StorageClientModel } from '../../../models';
import { StorageClient } from '../../../types';
import './../../../../style.scss';

const clientResource: WatchK8sResource = {
  kind: referenceForModel(StorageClientModel),
  isList: true,
};

const getStorageClientHealth = (
  storageClient: StorageClient,
  loaded: boolean,
  loadError: any
) => {
  if (loadError) {
    return { state: HealthState.NOT_AVAILABLE, message: '' };
  }
  if (!loaded) {
    return { state: HealthState.LOADING, message: '' };
  }
  if (_.isEmpty(storageClient)) {
    return { state: HealthState.NOT_AVAILABLE };
  }

  const phase = storageClient.status.phase;
  switch (phase) {
    case 'Initializing':
    case 'Progressing':
    case 'Onboarding':
    case 'Offboarding':
      return { state: HealthState.PROGRESS, message: phase };
    case 'Connected':
      return { state: HealthState.OK, message: phase };
    case 'Failed':
      return { state: HealthState.ERROR, message: phase };
    default:
      return { state: HealthState.NOT_AVAILABLE, message: '' };
  }
};

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [data, loaded, loadError] =
    useK8sWatchResource<StorageClient[]>(clientResource);

  const cephHealth = getStorageClientHealth(data?.[0], loaded, loadError);

  return (
    <Card className="odf-overview-card--gradient">
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <HealthBody>
        <Gallery className="odf-overview-status__health" hasGutter>
          <GalleryItem>
            <HealthItem
              title={t('Storage Client')}
              state={cephHealth.state}
              details={cephHealth.message}
            />
          </GalleryItem>
        </Gallery>
      </HealthBody>
    </Card>
  );
};

export default StatusCard;
