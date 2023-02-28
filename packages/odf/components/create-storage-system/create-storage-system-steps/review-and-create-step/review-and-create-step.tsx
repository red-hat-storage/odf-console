import * as React from 'react';
import {
  getAllZone,
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
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import {
  TextContent,
  Text,
  TextVariants,
  List,
  ListItem,
} from '@patternfly/react-core';
import { FEATURES } from '../../../../features';
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
  hasOCS,
}) => {
  const { t } = useCustomTranslation();
  const isMultusSupported = useFlag(FEATURES.OCS_MULTUS);
  const isTaintSupported = useFlag(FEATURES.OCS_TAINT_NODES);

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
  const { deployment, externalStorage, type, enableNFS } = backingStorage;

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

  const hasEncryption = encryption.clusterWide || encryption.storageClass;
  const hasInTransitEncryption = encryption.inTransit
    ? t('Enabled')
    : t('Disabled');

  const storagePlatform =
    externalStorage && getExternalStorage(externalStorage).displayName;

  const encryptionStatus = hasEncryption ? t('Enabled') : t('Disabled');
  const ocsTaintsStatus = enableTaint ? t('Enabled') : t('Disabled');
  const nfsStatus = enableNFS ? t('Enabled') : t('Disabled');

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
          {isTaintSupported && (
            <ListItem>
              {t('Taint nodes: {{ocsTaintsStatus}}', {
                ocsTaintsStatus,
              })}
            </ListItem>
          )}
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
            {isMultusSupported && (
              <ListItem>
                {t('Network: {{networkType}}', {
                  networkType: NetworkTypeLabels[networkType],
                })}
              </ListItem>
            )}
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
};
