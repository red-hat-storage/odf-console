import * as React from 'react';
import {
  STORAGE_CLUSTER_SYSTEM_KIND,
  NO_PROVISIONER,
} from '@odf/core/constants';
import { useSafeK8sGet } from '@odf/core/hooks';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { scResource } from '@odf/core/resources';
import { BackingStorageType, DeploymentType } from '@odf/core/types';
import { getSupportedVendors } from '@odf/core/utils';
import { getStorageClassDescription } from '@odf/core/utils';
import { StorageClassWizardStepExtensionProps as ExternalStorage } from '@odf/odf-plugin-sdk/extensions';
import { RHCS_SUPPORTED_INFRA } from '@odf/shared/constants/common';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import {
  ClusterServiceVersionModel,
  StorageClassModel,
  StorageClusterModel,
} from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import {
  ListKind,
  StorageClassResourceKind,
  ClusterServiceVersionKind,
  InfraProviders,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { isDefaultClass, getODFCsv, getGVKLabel } from '@odf/shared/utils';
import * as _ from 'lodash-es';
import {
  Form,
  FormGroup,
  Radio,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { WizardState, WizardDispatch } from '../../reducer';
import './backing-storage-step.scss';

// ODF watches only 2 namespaces (other one is operator install namespace)
const OCS_MULTIPLE_CLUSTER_NS = 'openshift-storage-extended';

const StorageClassSelection: React.FC<StorageClassSelectionProps> = ({
  dispatch,
  selected,
}) => {
  const { t } = useCustomTranslation();

  const onStorageClassSelect = React.useCallback(
    (sc: StorageClassResourceKind) =>
      dispatch({
        type: 'wizard/setStorageClass',
        payload: { name: sc?.metadata?.name, provisioner: sc?.provisioner },
      }),
    [dispatch]
  );
  const getInitialSelection = React.useCallback(
    (sces: StorageClassResourceKind[]) => {
      if (!selected.name) return sces.find((sc) => isDefaultClass(sc));
      return sces.find((sc) => getName(sc) === selected.name);
    },
    [selected.name]
  );

  return (
    <div className="odf-backing-storage__selection--width">
      <ResourceDropdown
        resource={scResource}
        resourceModel={StorageClassModel}
        onSelect={onStorageClassSelect}
        secondaryTextGenerator={getStorageClassDescription}
        initialSelection={getInitialSelection}
        data-test="storage-class-dropdown"
      >
        {(loaded, loadError, resources) =>
          loaded && !loadError && _.isEmpty(resources) ? (
            <Alert
              variant={AlertVariant.warning}
              isInline
              isPlain
              className="odf-backing-store__dropdown--margin-top"
              title={t(
                'No existing StorageClass found, refer to the documentation to create a StorageClass.'
              )}
            />
          ) : null
        }
      </ResourceDropdown>
    </div>
  );
};

type StorageClassSelectionProps = {
  dispatch: WizardDispatch;
  selected: WizardState['storageClass'];
};

export const BackingStorage: React.FC<BackingStorageProps> = ({
  state,
  storageClass,
  dispatch,
  hasOCS,
  hasExternal,
  hasInternal,
  infraType,
  error,
  loaded,
  supportedExternalStorage,
}) => {
  const { type, externalStorage, deployment } = state;

  const { t } = useCustomTranslation();

  const { odfNamespace, isODFNsLoaded, odfNsLoadError } =
    useODFNamespaceSelector();

  const [sc, scLoaded, scLoadError] =
    useK8sGet<ListKind<StorageClassResourceKind>>(StorageClassModel);
  const [csvList, csvListLoaded, csvListLoadError] = useSafeK8sGet<
    ListKind<ClusterServiceVersionKind>
  >(ClusterServiceVersionModel, null, odfNamespace);

  const isFullDeployment = deployment === DeploymentType.FULL;
  const isNonRHCSExternalType =
    type === BackingStorageType.EXTERNAL &&
    externalStorage !== StorageClusterModel.kind;

  const allowedExternalStorage: ExternalStorage[] = React.useMemo(() => {
    const odfCsv = getODFCsv(csvList?.items);
    const supportedODFVendors = getSupportedVendors(odfCsv);
    const enableRhcs =
      RHCS_SUPPORTED_INFRA.includes(infraType) && isFullDeployment;

    // Only single external RHCS is allowed
    return !enableRhcs || hasExternal
      ? supportedExternalStorage.filter(({ model }) => {
          const kind = getGVKLabel(model);
          return (
            supportedODFVendors.includes(kind) &&
            kind !== STORAGE_CLUSTER_SYSTEM_KIND
          );
        })
      : supportedExternalStorage;
  }, [
    isFullDeployment,
    infraType,
    csvList,
    hasExternal,
    supportedExternalStorage,
  ]);

  React.useEffect(() => {
    /*
     * Set the namespace where the StorageSystem will be created.
     * First cluster should only be created in ODF install namespace.
     */
    const setODFInstallNsAsDefault = !hasOCS || isNonRHCSExternalType;
    if (isODFNsLoaded && !odfNsLoadError) {
      dispatch({
        type: 'backingStorage/setSystemNamespace',
        payload: setODFInstallNsAsDefault
          ? odfNamespace
          : OCS_MULTIPLE_CLUSTER_NS,
      });
    }
  }, [
    dispatch,
    odfNamespace,
    isODFNsLoaded,
    odfNsLoadError,
    hasOCS,
    isNonRHCSExternalType,
  ]);

  React.useEffect(() => {
    /*
     * Allow pre selecting the "external connection" option instead of the "existing" option
     * if an OCS Storage System is already created.
     */
    if (hasOCS && allowedExternalStorage.length) {
      dispatch({
        type: 'backingStorage/setType',
        payload: BackingStorageType.EXTERNAL,
      });
      dispatch({
        type: 'wizard/setStorageClass',
        payload: {
          name: '',
          provisioner: '',
        },
      });
    }
  }, [dispatch, allowedExternalStorage.length, hasOCS]);

  React.useEffect(() => {
    /*
     * Allow pre selecting the "create new storage class" option instead of the "existing" option
     * if no storage classes present. This is true for a baremetal platform.
     */
    if (
      sc?.items?.length === 0 &&
      type !== BackingStorageType.EXTERNAL &&
      !hasInternal
    ) {
      dispatch({
        type: 'backingStorage/setType',
        payload: BackingStorageType.LOCAL_DEVICES,
      });
      dispatch({
        type: 'wizard/setStorageClass',
        payload: {
          name: '',
          provisioner: NO_PROVISIONER,
        },
      });
    }
  }, [deployment, dispatch, sc, type, hasInternal]);

  const showStorageClassSelection =
    !hasOCS && type === BackingStorageType.EXISTING;

  const RADIO_GROUP_NAME = 'backing-storage-radio-group';

  const onRadioSelect = (_unused, event) => {
    const newType = event.target.value;
    dispatch({ type: 'backingStorage/setType', payload: newType });
  };

  const allLoaded = loaded && scLoaded && csvListLoaded && isODFNsLoaded;
  const anyError = error || scLoadError || csvListLoadError || odfNsLoadError;

  if (!allLoaded || !!anyError) {
    return <StatusBox loaded={allLoaded} loadError={anyError} />;
  }

  // Internal cluster should be created (or should already exist) before external mode cluster creation
  // Block more than two OCS cluster creations
  // Block internal cluster creation after external cluster already created
  return (
    <Form>
      <FormGroup
        label={t('Backing storage type')}
        fieldId={`bs-${BackingStorageType.EXISTING}`}
      >
        <Radio
          label={t('Use an existing StorageClass')}
          description={t(
            'Data Foundation will use an existing StorageClass available on your hosting platform.'
          )}
          name={RADIO_GROUP_NAME}
          value={BackingStorageType.EXISTING}
          isChecked={type === BackingStorageType.EXISTING}
          onChange={(event, _unused) => onRadioSelect(_unused, event)}
          isDisabled={hasOCS || sc?.items?.length === 0}
          body={
            showStorageClassSelection && (
              <StorageClassSelection
                dispatch={dispatch}
                selected={storageClass}
              />
            )
          }
          id={`bs-${BackingStorageType.EXISTING}`}
          className="odf-backing-store__radio--margin-bottom"
        />
        <Radio
          label={t('Create a new StorageClass using local storage devices')}
          description={t(
            'Data Foundation will use a StorageClass provided by the Local Storage Operator (LSO) on top of your attached drives. This option is available on any platform with devices attached to nodes.'
          )}
          name={RADIO_GROUP_NAME}
          value={BackingStorageType.LOCAL_DEVICES}
          isChecked={type === BackingStorageType.LOCAL_DEVICES}
          onChange={(event, _unused) => onRadioSelect(_unused, event)}
          isDisabled={hasOCS}
          id={`bs-${BackingStorageType.LOCAL_DEVICES}`}
          className="odf-backing-store__radio--margin-bottom"
        />
      </FormGroup>
    </Form>
  );
};

type BackingStorageProps = {
  dispatch: WizardDispatch;
  state: WizardState['backingStorage'];
  hasOCS: boolean;
  hasExternal: boolean;
  hasInternal: boolean;
  storageClass: WizardState['storageClass'];
  stepIdReached: WizardState['stepIdReached'];
  infraType: InfraProviders;
  error: any;
  loaded: boolean;
  supportedExternalStorage: ExternalStorage[];
};
