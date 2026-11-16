import * as React from 'react';
import { StorageVendorId } from '@odf/mco/constants';
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
} from '@odf/mco/utils/storage-vendor-registry';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Alert,
  AlertVariant,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Flex,
  Label,
} from '@patternfly/react-core';
import { DRPolicyAction, DRPolicyActionType } from '../../utils/reducer';

type ProviderCardProps = {
  descriptor: StorageVendorDescriptor;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (id: StorageVendorId) => void;
};

const ProviderCard: React.FC<ProviderCardProps> = ({
  descriptor,
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
    descriptor.id === StorageVendorId.DataFoundation
      ? t('Natively integrated with OpenShift.')
      : descriptor.id === StorageVendorId.IbmStorageScale
        ? t('IBM Storage Scale for container native storage at scale.')
        : t('For external third-party storage backends.');

  return (
    <Card
      id={`provider-option-${descriptor.id}`}
      isCompact
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
          {isDisabled && (
            <Label className="pf-v6-u-ml-sm" color="grey" isCompact>
              {t('Paired')}
            </Label>
          )}
        </CardTitle>
      </CardHeader>
      <CardBody className="pf-v6-u-font-size-xs pf-v6-u-text-color-subtle">
        {description}
      </CardBody>
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

  const selectable = vendors.filter((v) => !v.isDisabled);
  const onlyOption =
    selectable.length === 1 ? selectable[0].descriptor.id : undefined;
  React.useEffect(() => {
    if (onlyOption && !selectedVendor) {
      dispatch({
        type: DRPolicyActionType.SET_STORAGE_VENDOR,
        payload: onlyOption,
      });
    }
  }, [onlyOption, selectedVendor, dispatch]);

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
      <Flex
        direction={{ default: 'column' }}
        spaceItems={{ default: 'spaceItemsLg' }}
      >
        {vendors.map(({ descriptor, isDisabled }) => (
          <ProviderCard
            key={descriptor.id}
            descriptor={descriptor}
            isSelected={selectedVendor === descriptor.id}
            isDisabled={isDisabled}
            onSelect={handleSelect}
          />
        ))}
      </Flex>
    </>
  );
};
