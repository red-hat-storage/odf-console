import * as React from 'react';
import {
  getExternalStorage,
  getTotalCpu,
  getTotalMemory,
} from '@odf/core/components/utils';
import {
  NetworkTypeLabels,
  NO_PROVISIONER,
  OSD_CAPACITY_SIZES,
} from '@odf/core/constants';
import { BackingStorageType, DeploymentType } from '@odf/core/types';
import { getAllZone } from '@odf/core/utils';
import { StorageClassWizardStepExtensionProps as ExternalStorage } from '@odf/odf-plugin-sdk/extensions';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getFormattedCapacity, humanizeBinaryBytes } from '@odf/shared/utils';
import * as _ from 'lodash-es';
import {
  TextContent,
  Text,
  TextVariants,
  List,
  ListItem,
} from '@patternfly/react-core';
import { WizardState } from '../../reducer';
import './review-and-create-step.scss';

export const ReviewItem = ({ children, title }) => (
  <div className="odf-review-and-create__review-item">
    <TextContent>
      <Text component={TextVariants.h4}>{title}</Text>
    </TextContent>
    <List isPlain>{children}</List>
  </div>
);

export const ReviewAndCreate: React.FC<ReviewAndCreateProps> = ({
  state,
  // any internal or external exists
  hasOCS,
  // both internal and external exists
  hasMultipleClusters,
  supportedExternalStorage,
}) => {
  const { t } = useCustomTranslation();

  const {
    storageClass,
    capacityAndNodes,
    securityAndNetwork,
    createLocalVolumeSet,
    backingStorage,
    connectionDetails,
    createStorageClass,
    nodes,
  } = state;
  const { capacity, arbiterLocation, enableTaint, enableArbiter } =
    capacityAndNodes;
  const { encryption, kms, networkType } = securityAndNetwork;
  const {
    deployment,
    externalStorage,
    type,
    enableNFS,
    isRBDStorageClassDefault,
  } = backingStorage;

  // NooBaa standalone deployment
  const isMCG = deployment === DeploymentType.MCG;
  // External Red Hat Ceph Storage deployment
  const isRhcs = !_.isEmpty(connectionDetails);
  // External IBM deployment without ODF
  const isStandaloneExternal = hasOCS && !_.isEmpty(createStorageClass);

  const isNoProvisioner = storageClass.provisioner === NO_PROVISIONER;
  const formattedCapacity = !isNoProvisioner
    ? `${OSD_CAPACITY_SIZES[capacity]} TiB`
    : humanizeBinaryBytes(capacity).string;
  const formattedCapacityLimit = getFormattedCapacity(
    capacityAndNodes.capacityAutoScaling.capacityLimit
  );

  const hasEncryption = encryption.clusterWide || encryption.storageClass;
  const hasInTransitEncryption = encryption.inTransit
    ? t('Enabled')
    : t('Disabled');

  const storagePlatform =
    externalStorage &&
    getExternalStorage(externalStorage, supportedExternalStorage).displayName;

  const encryptionStatus = hasEncryption ? t('Enabled') : t('Disabled');
  const ocsTaintsStatus = enableTaint ? t('Enabled') : t('Disabled');
  const nfsStatus = enableNFS ? t('Enabled') : t('Disabled');
  const isCephRBDSetAsDefault = isRBDStorageClassDefault
    ? t('Enabled')
    : t('Disabled');

  const kmsStatus = encryption.advanced
    ? kms.providerState.name.value
    : t('Not connected');

  const totalCpu = getTotalCpu(nodes);
  const totalMemory = getTotalMemory(nodes);
  const zones = getAllZone(nodes);

  return (
    <>
      <ReviewItem title={t('Backing storage')}>
        {!isRhcs && !isStandaloneExternal && (
          <ListItem>
            {t('Deployment type: {{deployment}}', {
              deployment,
            })}
          </ListItem>
        )}
        {deployment === DeploymentType.FULL &&
          type !== BackingStorageType.EXTERNAL && (
            <ListItem>
              {t('Network file system: {{nfsStatus}}', {
                nfsStatus,
              })}
            </ListItem>
          )}
        {deployment === DeploymentType.FULL && !hasMultipleClusters && (
          <ListItem>
            {t(
              'Ceph RBD as the default StorageClass: {{isCephRBDSetAsDefault}}',
              {
                isCephRBDSetAsDefault,
              }
            )}
          </ListItem>
        )}
        {!isRhcs && (
          <ListItem>
            {t('Backing storage type: {{name}}', {
              name: storageClass.name || createLocalVolumeSet.volumeSetName,
            })}
          </ListItem>
        )}
        {type === BackingStorageType.EXTERNAL && (
          <ListItem>
            {t('External storage platform: {{storagePlatform}}', {
              storagePlatform,
            })}
          </ListItem>
        )}
      </ReviewItem>
      {!isMCG && !isRhcs && !isStandaloneExternal && (
        <ReviewItem title={t('Capacity and nodes')}>
          <ListItem>
            {t('Cluster capacity: {{capacity}}', {
              capacity: formattedCapacity,
            })}
          </ListItem>
          <ListItem>
            {t('Selected nodes: {{nodeCount, number}} node', {
              nodeCount: nodes.length,
              count: nodes.length,
            })}
          </ListItem>
          <ListItem>
            {t('CPU and memory: {{cpu, number}} CPU and {{memory}} memory', {
              cpu: totalCpu,
              memory: humanizeBinaryBytes(totalMemory).string,
            })}
          </ListItem>
          <ListItem>
            {t('Performance profile: {{resourceProfile}}', {
              resourceProfile: _.capitalize(capacityAndNodes.resourceProfile),
            })}
          </ListItem>
          <ListItem>
            {t('Smart scaling: {{autoscaling}}', {
              autoscaling: capacityAndNodes.capacityAutoScaling.enable
                ? 'Enabled'
                : 'Disabled',
            })}
            {capacityAndNodes.capacityAutoScaling.enable && (
              <ListItem>
                {t('Scaling capacity limit: {{capacityLimit}}', {
                  capacityLimit: formattedCapacityLimit,
                })}
              </ListItem>
            )}
          </ListItem>
          <ListItem>
            {t('Zone: {{zoneCount, number}} zone', {
              zoneCount: zones.size,
              count: zones.size,
            })}
          </ListItem>
          {enableArbiter && (
            <ListItem>
              {t('Arbiter zone: {{zone}}', {
                zone: arbiterLocation,
              })}
            </ListItem>
          )}
          <ListItem>
            {t('Taint nodes: {{ocsTaintsStatus}}', {
              ocsTaintsStatus,
            })}
          </ListItem>
        </ReviewItem>
      )}
      {!isRhcs &&
        !isStandaloneExternal &&
        (isMCG ? (
          <ReviewItem title={t('Security')}>
            <ListItem>{t('Encryption: Enabled')}</ListItem>
            <ListItem>
              {t('External key management service: {{kmsStatus}}', {
                kmsStatus,
              })}
            </ListItem>
          </ReviewItem>
        ) : (
          <ReviewItem title={t('Security and network')}>
            <ListItem>
              {t('Encryption: {{encryptionStatus}}', { encryptionStatus })}
            </ListItem>
            <ListItem>
              {t('In-transit encryption: {{hasInTransitEncryption}}', {
                hasInTransitEncryption,
              })}
            </ListItem>
            {hasEncryption && (
              <ListItem>
                {t('External key management service: {{kmsStatus}}', {
                  kmsStatus,
                })}
              </ListItem>
            )}
            <ListItem>
              {t('Network: {{networkType}}', {
                networkType: NetworkTypeLabels[networkType],
              })}
            </ListItem>
          </ReviewItem>
        ))}
      {isRhcs && (
        <ReviewItem title={t('Security and network')}>
          <ListItem>
            {t('In-transit encryption: {{hasInTransitEncryption}}', {
              hasInTransitEncryption,
            })}
          </ListItem>
        </ReviewItem>
      )}
    </>
  );
};
type ReviewAndCreateProps = {
  state: WizardState;
  hasOCS: boolean;
  hasMultipleClusters: boolean;
  supportedExternalStorage: ExternalStorage[];
};
