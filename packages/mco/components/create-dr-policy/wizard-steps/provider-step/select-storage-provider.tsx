import * as React from 'react';
import {
  ManagedClusterInfoType,
  MirrorPeerKind,
  DRPolicyKind,
} from '@odf/mco/types';
import {
  getAvailableVendors,
  getStorageVendorLabel,
  resolvePairOwner,
  StorageVendorDescriptor,
  StorageVendorId,
} from '@odf/mco/utils/storage-vendor-registry';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Alert,
  AlertVariant,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Gallery,
  Label,
} from '@patternfly/react-core';
import { DRPolicyAction, DRPolicyActionType } from '../../utils/reducer';

type ProviderCardProps = {
  descriptor: StorageVendorDescriptor;
  clusterNames: string[];
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (id: StorageVendorId) => void;
};

const ProviderCard: React.FC<ProviderCardProps> = ({
  descriptor,
  clusterNames,
  isSelected,
  isDisabled,
  onSelect,
}) => {
  const { t } = useCustomTranslation();
  const onChange = (_event: React.FormEvent<HTMLInputElement>) => {
    if (!isDisabled) {
      onSelect(descriptor.id);
    }
  };

  const label = getStorageVendorLabel(descriptor.id, t);
  const description =
    descriptor.id === 'data-foundation'
      ? t('Natively integrated with OpenShift.')
      : descriptor.id === 'ibm-storage-scale'
        ? t('IBM Storage Scale for container native storage at scale.')
        : t('For external third-party storage backends.');

  const showRecommended = descriptor.id === 'data-foundation';

  const clusterLabel =
    clusterNames.length === 0
      ? t('No clusters selected')
      : t('Selected Clusters: {{clusters}}', {
          clusters: clusterNames.join(', '),
        });

  return (
    <Card
      id={`provider-option-${descriptor.id}`}
      isSelectable={!isDisabled}
      onClick={() => !isDisabled && onSelect(descriptor.id)}
      isSelected={isSelected}
      isDisabled={isDisabled}
    >
      <CardHeader
        selectableActions={
          isDisabled
            ? undefined
            : {
                selectableActionId: `selectable-action-${descriptor.id}`,
                selectableActionAriaLabelledby: `provider-option-title-${descriptor.id}`,
                name: 'single-selectable-storage-provider',
                variant: 'single',
                onChange,
                hasNoOffset: true,
              }
        }
      >
        <CardTitle id={`provider-option-title-${descriptor.id}`}>
          {label}
          {showRecommended && (
            <Label className="pf-v6-u-ml-sm" color="blue" isCompact>
              {t('Recommended')}
            </Label>
          )}
          {isDisabled && (
            <Label className="pf-v6-u-ml-sm" color="grey" isCompact>
              {t('Paired')}
            </Label>
          )}
        </CardTitle>
      </CardHeader>
      <CardBody>{description}</CardBody>
      <CardFooter>{clusterLabel}</CardFooter>
    </Card>
  );
};

type SelectStorageProviderProps = {
  selectedClusters: ManagedClusterInfoType[];
  selectedVendor?: StorageVendorId;
  mirrorPeers: MirrorPeerKind[];
  drPolicies: DRPolicyKind[];
  dispatch: React.Dispatch<DRPolicyAction>;
  onProviderChange?: () => void;
};

export const SelectStorageProvider: React.FC<SelectStorageProviderProps> = ({
  selectedClusters,
  selectedVendor,
  mirrorPeers,
  drPolicies,
  dispatch,
  onProviderChange,
}) => {
  const { t } = useCustomTranslation();
  const clusterNames = selectedClusters.map(getName);
  const owner =
    clusterNames.length === 2
      ? resolvePairOwner(
          [clusterNames[0], clusterNames[1]],
          mirrorPeers,
          drPolicies
        )
      : undefined;

  const vendors = getAvailableVendors(selectedClusters, owner);

  const handleSelect = (id: StorageVendorId) => {
    if (id !== selectedVendor) {
      onProviderChange?.();
    }
    dispatch({
      type: DRPolicyActionType.SET_STORAGE_VENDOR,
      payload: id,
    });
  };

  const allPaired = vendors.length > 0 && vendors.every((v) => v.isDisabled);

  return (
    <>
      {allPaired && (
        <Alert
          className="odf-alert pf-v6-u-mb-md"
          variant={AlertVariant.info}
          isInline
          title={t('This cluster pair is already paired')}
        >
          {t(
            'Every storage provider available to these clusters is already paired. Go back and choose a different pair of clusters.'
          )}
        </Alert>
      )}
      <Gallery hasGutter>
        {vendors.map(({ descriptor, isDisabled }) => (
          <ProviderCard
            key={descriptor.id}
            descriptor={descriptor}
            clusterNames={clusterNames}
            isSelected={selectedVendor === descriptor.id}
            isDisabled={isDisabled}
            onSelect={handleSelect}
          />
        ))}
      </Gallery>
    </>
  );
};
