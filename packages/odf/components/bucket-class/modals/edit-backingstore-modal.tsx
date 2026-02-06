import * as React from 'react';
import {
  NooBaaBackingStoreModel,
  NooBaaBucketClassModel,
  NooBaaNamespaceStoreModel,
} from '@odf/shared';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import {
  CommonModalProps,
  ModalBody,
  ModalFooter,
} from '@odf/shared/modals/Modal';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { k8sUpdate } from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { ActionGroup, Alert, Button } from '@patternfly/react-core';
import { NamespacePolicyType } from '../../../constants';
import {
  BackingStoreKind,
  BucketClassKind,
  NamespaceStoreKind,
  PlacementPolicy,
} from '../../../types';
import {
  getBackingStoreNames,
  getBackingStorePolicy,
  validateDuration,
} from '../../../utils';
import BackingStoreSelection from '../backingstore-table';
import { reducer, initialState } from '../state';
import { CacheNamespaceStorePage } from '../wizard-pages/namespace-store-pages/cache-namespace-store';
import { MultiNamespaceStorePage } from '../wizard-pages/namespace-store-pages/multi-namespace-store';
import { SingleNamespaceStorePage } from '../wizard-pages/namespace-store-pages/single-namespace-store';
import './_bs-modal.scss';

const BucketClassEditModal: React.FC<BucketClassEditModalProps> = (props) => {
  const { t } = useCustomTranslation();
  const {
    isOpen,
    closeModal,
    extraProps: { resource: bucketClass },
  } = props;
  const isNamespaceType = !!bucketClass.spec?.namespacePolicy;
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const [data, loaded, loadError] = useK8sList<BackingStoreKind>(
    NooBaaBackingStoreModel,
    bucketClass.metadata.namespace
  );

  const [nsData, nsLoaded, nsLoadErr] = useK8sList<NamespaceStoreKind>(
    NooBaaNamespaceStoreModel,
    bucketClass.metadata.namespace
  );

  const [inProgress, setProgress] = React.useState(false);
  const [error, setError] = React.useState('');

  const policyA = getBackingStorePolicy(bucketClass, 0);
  const policyB = getBackingStorePolicy(bucketClass, 1);

  const getNamespaceStorePage = () => {
    switch (state.namespacePolicyType) {
      case NamespacePolicyType.SINGLE:
        return (
          <SingleNamespaceStorePage
            hideCreateNamespaceStore
            state={state}
            dispatch={dispatch}
            namespace={bucketClass.metadata.namespace}
          />
        );
      case NamespacePolicyType.CACHE:
        return (
          <CacheNamespaceStorePage
            hideCreateNamespaceStore
            state={state}
            dispatch={dispatch}
            namespace={bucketClass.metadata.namespace}
          />
        );
      case NamespacePolicyType.MULTI:
        return (
          <MultiNamespaceStorePage
            hideCreateNamespaceStore
            state={state}
            dispatch={dispatch}
            namespace={bucketClass.metadata.namespace}
          />
        );
      default:
        return null;
    }
  };

  // Resolve to BackingStore Objects from Name
  React.useEffect(() => {
    if (!isNamespaceType && loaded && !loadError) {
      const bsNamesTier1 = getBackingStoreNames(bucketClass, 0);
      const bsNamesTier2 = getBackingStoreNames(bucketClass, 1);
      const bsTier1 = data.filter((item) =>
        bsNamesTier1.includes(getName(item))
      );
      const bsTier2 = data.filter((item) =>
        bsNamesTier2.includes(getName(item))
      );
      dispatch({ type: 'setBackingStoreTier1', value: bsTier1 });
      dispatch({ type: 'setBackingStoreTier2', value: bsTier2 });
    }
  }, [data, loaded, loadError, bucketClass, isNamespaceType]);

  React.useEffect(() => {
    if (isNamespaceType && nsLoaded && !nsLoadErr) {
      dispatch({
        type: 'setNamespacePolicyType',
        value: bucketClass.spec?.namespacePolicy.type,
      });
      if (
        bucketClass.spec?.namespacePolicy.type === NamespacePolicyType.SINGLE
      ) {
        const singleNS = nsData.find(
          (item) =>
            getName(item) === bucketClass.spec.namespacePolicy.single.resource
        );
        dispatch({ type: 'setWriteNamespaceStore', value: [singleNS] });
        dispatch({ type: 'setReadNamespaceStore', value: [singleNS] });
      }
      if (
        bucketClass.spec?.namespacePolicy.type === NamespacePolicyType.MULTI
      ) {
        const writeNS = nsData.find(
          (item) =>
            getName(item) ===
            bucketClass.spec.namespacePolicy.multi.writeResource
        );
        const readNS = nsData.filter((item) =>
          bucketClass.spec.namespacePolicy.multi.readResources.includes(
            getName(item)
          )
        );
        dispatch({ type: 'setWriteNamespaceStore', value: [writeNS] });
        dispatch({ type: 'setReadNamespaceStore', value: readNS });
      }
      if (
        bucketClass.spec?.namespacePolicy.type === NamespacePolicyType.CACHE
      ) {
        const hubNS = nsData.find(
          (item) =>
            getName(item) === bucketClass.spec.namespacePolicy.cache.hubResource
        );
        const cacheBS = data.find((item) =>
          bucketClass.spec.placementPolicy.tiers[0].backingStores.includes(
            getName(item)
          )
        );
        dispatch({ type: 'setHubNamespaceStore', value: hubNS });
        dispatch({ type: 'setCacheBackingStore', value: cacheBS });
      }
    }
  }, [bucketClass, nsData, nsLoaded, nsLoadErr, isNamespaceType, data]);

  const isEnabled = (() => {
    const satifiesPolicyA = (() => {
      if (policyA === PlacementPolicy.Spread) {
        return state.tier1BackingStore?.length >= 1;
      }
      if (policyA === PlacementPolicy.Mirror) {
        return state.tier1BackingStore?.length >= 2;
      }
      return false;
    })();
    const satifiesPolicyB = policyB
      ? policyB === PlacementPolicy.Spread
        ? state.tier2BackingStore?.length >= 1
        : state.tier2BackingStore?.length >= 2
      : true;
    return satifiesPolicyA && satifiesPolicyB;
  })();

  const isEnabledNS = () => {
    if (state.namespacePolicyType === NamespacePolicyType.SINGLE) {
      return (
        state.readNamespaceStore.length === 1 &&
        state.writeNamespaceStore.length === 1
      );
    }
    if (state.namespacePolicyType === NamespacePolicyType.MULTI) {
      return (
        state.readNamespaceStore.length >= 1 &&
        state.writeNamespaceStore.length === 1
      );
    }
    if (state.namespacePolicyType === NamespacePolicyType.CACHE) {
      return (
        !!state.hubNamespaceStore &&
        !!state.cacheBackingStore &&
        validateDuration(state.timeToLive)
      );
    }
    return false;
  };

  const onSubmit = () => {
    setProgress(true);
    if (!isNamespaceType) {
      bucketClass.spec.placementPolicy.tiers[0].backingStores =
        state.tier1BackingStore.map(getName);
      if (policyB?.length) {
        bucketClass.spec.placementPolicy.tiers[1].backingStores =
          state.tier2BackingStore.map(getName);
      }
    } else {
      switch (state.namespacePolicyType) {
        case NamespacePolicyType.SINGLE:
          bucketClass.spec.namespacePolicy.single.resource = getName(
            state.readNamespaceStore[0]
          );
          break;
        case NamespacePolicyType.MULTI:
          bucketClass.spec.namespacePolicy.multi.writeResource = getName(
            state.writeNamespaceStore[0]
          );
          bucketClass.spec.namespacePolicy.multi.readResources =
            state.readNamespaceStore.map(getName);
          break;
        case NamespacePolicyType.CACHE:
          bucketClass.spec.namespacePolicy.cache.hubResource = getName(
            state.hubNamespaceStore
          );
          bucketClass.spec.namespacePolicy.cache.caching.ttl = state.timeToLive;
          bucketClass.spec.placementPolicy.tiers[0].backingStores = [
            getName(state.cacheBackingStore),
          ];
          break;
        default:
      }
    }

    k8sUpdate({
      model: NooBaaBucketClassModel,
      name: getName(bucketClass),
      data: bucketClass,
    })
      .then(() => {
        setProgress(false);
        closeModal();
      })
      .catch((err) => {
        setError(err);
      });
  };
  return (
    <Modal
      title={t('Edit BucketClass Resource')}
      isOpen={isOpen}
      variant={ModalVariant.medium}
      onClose={closeModal}
    >
      {nsLoaded && loaded ? (
        <>
          <ModalBody className="nb-bc-modal">
            <p className="nb-bc-modal__text">
              {t(
                '{{storeType}} represents a storage target to be used as the underlying storage for the data in Multicloud Object Gateway buckets.',
                {
                  storeType: isNamespaceType
                    ? t('NamespaceStore')
                    : t('BackingStore'),
                }
              )}
            </p>
            {!isNamespaceType ? (
              <BackingStoreSelection
                tier1Policy={policyA}
                tier2Policy={policyB}
                selectedTierA={state.tier1BackingStore}
                selectedTierB={state.tier2BackingStore}
                setSelectedTierA={(selectedA) =>
                  dispatch({ type: 'setBackingStoreTier1', value: selectedA })
                }
                setSelectedTierB={(selectedB) =>
                  dispatch({ type: 'setBackingStoreTier2', value: selectedB })
                }
                hideCreateBackingStore
              />
            ) : (
              getNamespaceStorePage()
            )}
            {error && (
              <Alert isInline variant="danger" title={t('An error occurred')}>
                {(error as any)?.message}
              </Alert>
            )}
          </ModalBody>
          <ModalFooter>
            <ActionGroup>
              <Button
                onClick={closeModal}
                aria-label={t('Cancel')}
                variant="secondary"
              >
                {t('Cancel')}
              </Button>
              {!inProgress ? (
                <Button
                  onClick={onSubmit}
                  aria-label={t('Save')}
                  type="submit"
                  className="nb-edit-modal__save-btn"
                  isDisabled={isNamespaceType ? !isEnabledNS() : !isEnabled}
                >
                  {t('Save')}
                </Button>
              ) : (
                <LoadingInline />
              )}
            </ActionGroup>
          </ModalFooter>
        </>
      ) : (
        <LoadingBox />
      )}
    </Modal>
  );
};

export default BucketClassEditModal;

type BucketClassEditModalProps = CommonModalProps<{
  resource: BucketClassKind;
}>;
