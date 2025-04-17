import * as React from 'react';
import {
  STORAGE_CLUSTER_SYSTEM_KIND,
  NO_PROVISIONER,
} from '@odf/core/constants';
import { PROVIDER_MODE } from '@odf/core/features';
import { useSafeK8sGet } from '@odf/core/hooks';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { scResource } from '@odf/core/resources';
import { BackingStorageType, DeploymentType } from '@odf/core/types';
import { getSupportedVendors } from '@odf/core/utils';
import { getStorageClassDescription } from '@odf/core/utils';
import { StorageClassWizardStepExtensionProps as ExternalStorage } from '@odf/odf-plugin-sdk/extensions';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import {
  ClusterServiceVersionModel,
  StorageClassModel,
  OCSStorageClusterModel,
} from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import {
  ListKind,
  StorageClassResourceKind,
  ClusterServiceVersionKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { isDefaultClass, getODFCsv, getGVKLabel } from '@odf/shared/utils';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import {
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  FormSelectProps,
  Radio,
  Alert,
  AlertVariant,
  Checkbox,
  HelperTextItem,
  FormHelperText,
  HelperText,
} from '@patternfly/react-core';
import { ErrorHandler } from '../../error-handler';
import { WizardState, WizardDispatch } from '../../reducer';
import { EnableNFS } from './enable-nfs';
import { PostgresConnectionDetails } from './noobaa-external-postgres/postgres-connection-details';
import { SelectDeployment } from './select-deployment';
import { SetCephRBDStorageClassDefault } from './set-rbd-sc-default';
import './backing-storage-step.scss';

const RHCS_SUPPORTED_INFRA = [
  'BareMetal',
  'None',
  'VSphere',
  'OpenStack',
  'oVirt',
  'IBMCloud',
];

// ODF watches only 2 namespaces (other one is operator install namespace)
const OCS_MULTIPLE_CLUSTER_NS = 'openshift-storage-extended';

const ExternalSystemSelection: React.FC<ExternalSystemSelectionProps> = ({
  dispatch,
  stepIdReached,
  selectOptions,
  selectedStorage,
}) => {
  const { t } = useCustomTranslation();

  const handleSelection: FormSelectProps['onChange'] = React.useCallback(
    (_event, value: string) => {
      if (stepIdReached === 2)
        dispatch({ type: 'wizard/setStepIdReached', payload: 1 });
      dispatch({
        type: 'backingStorage/setExternalStorage',
        payload: value,
      });
    },
    [dispatch, stepIdReached]
  );

  React.useEffect(() => {
    if (!selectedStorage) {
      handleSelection(null, selectOptions[0].model.kind);
    }
  }, [handleSelection, selectOptions, selectedStorage]);

  return (
    <FormGroup
      fieldId="storage-platform-name"
      label={t('Storage platform')}
      className=""
    >
      <FormSelect
        aria-label={t('Select external system from list')}
        value={selectedStorage}
        id="storage-platform-name"
        className="odf-backing-storage__selection--width  odf-backing-storage__selection--spacer"
        onChange={handleSelection}
      >
        {selectOptions.map(({ displayName, model: { kind } }) => (
          <FormSelectOption key={kind} value={kind} label={displayName} />
        ))}
      </FormSelect>
      <FormHelperText>
        <HelperText>
          <HelperTextItem>
            {t('Select a storage platform you wish to connect')}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

type ExternalSystemSelectionProps = {
  dispatch: WizardDispatch;
  stepIdReached: WizardState['stepIdReached'];
  selectedStorage: WizardState['backingStorage']['externalStorage'];
  selectOptions: ExternalStorage[];
};

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
  hasMultipleClusters,
  infraType,
  error,
  loaded,
  stepIdReached,
  supportedExternalStorage,
}) => {
  const {
    type,
    enableNFS,
    isRBDStorageClassDefault,
    externalStorage,
    deployment,
    externalPostgres,
    useExternalPostgres,
  } = state;

  const { t } = useCustomTranslation();

  const { odfNamespace, isODFNsLoaded, odfNsLoadError } =
    useODFNamespaceSelector();

  const [sc, scLoaded, scLoadError] =
    useK8sGet<ListKind<StorageClassResourceKind>>(StorageClassModel);
  const [csvList, csvListLoaded, csvListLoadError] = useSafeK8sGet<
    ListKind<ClusterServiceVersionKind>
  >(ClusterServiceVersionModel, null, odfNamespace);

  const isFullDeployment = deployment === DeploymentType.FULL;
  const isProviderMode = deployment === DeploymentType.PROVIDER_MODE;
  const isProviderModePresent = useFlag(PROVIDER_MODE) && hasInternal;
  const isNonRHCSExternalType =
    type === BackingStorageType.EXTERNAL &&
    externalStorage !== OCSStorageClusterModel.kind;

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
    if (hasOCS && allowedExternalStorage.length && !isProviderModePresent) {
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
  }, [dispatch, allowedExternalStorage.length, hasOCS, isProviderModePresent]);

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

  const showExternalStorageSelection =
    type === BackingStorageType.EXTERNAL && allowedExternalStorage.length;
  // Only single internal cluster allowed, should be created before external cluster
  const showStorageClassSelection =
    !hasOCS && type === BackingStorageType.EXISTING;

  const RADIO_GROUP_NAME = 'backing-storage-radio-group';

  const onRadioSelect = (_unused, event) => {
    const newType = event.target.value;
    dispatch({ type: 'backingStorage/setType', payload: newType });
  };

  const doesDefaultSCAlreadyExists = sc?.items?.some((item) =>
    isDefaultClass(item)
  );

  // Internal cluster should be created (or should already exist) before external mode cluster creation
  // Block more than two OCS cluster creations
  // Block internal cluster creation after external cluster already created
  return (
    <ErrorHandler
      error={error || scLoadError || csvListLoadError || odfNsLoadError}
      loaded={loaded && scLoaded && csvListLoaded && isODFNsLoaded}
    >
      <Form>
        {!hasOCS && (
          <SelectDeployment dispatch={dispatch} deployment={deployment} />
        )}
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
          <Radio
            label={t('Connect an external storage platform')}
            description={t(
              'Data Foundation will create a dedicated StorageClass.'
            )}
            name={RADIO_GROUP_NAME}
            value={BackingStorageType.EXTERNAL}
            isChecked={type === BackingStorageType.EXTERNAL}
            onChange={(event, _unused) => onRadioSelect(_unused, event)}
            isDisabled={
              allowedExternalStorage.length === 0 ||
              isProviderMode ||
              isProviderModePresent
            }
            body={
              showExternalStorageSelection && (
                <ExternalSystemSelection
                  selectedStorage={externalStorage}
                  dispatch={dispatch}
                  selectOptions={allowedExternalStorage}
                  stepIdReached={stepIdReached}
                />
              )
            }
            id={`bs-${BackingStorageType.EXTERNAL}`}
            className="odf-backing-store__radio--margin-bottom"
          />
        </FormGroup>
        {/* Should be visible for both external and internal mode (even if one cluster already exists) */}
        {isFullDeployment && !hasMultipleClusters && (
          <>
            <EnableNFS
              dispatch={dispatch}
              nfsEnabled={enableNFS}
              backingStorageType={type}
            />
            <SetCephRBDStorageClassDefault
              dispatch={dispatch}
              isRBDStorageClassDefault={isRBDStorageClassDefault}
              doesDefaultSCAlreadyExists={doesDefaultSCAlreadyExists}
            />
          </>
        )}
        {/* Should be visible for both external and internal mode (but only single NooBaa is allowed, so should be hidden if any cluster already exists) */}
        {!hasOCS && (
          <Checkbox
            id="use-external-postgress"
            label={t('Use external PostgreSQL')}
            description={t(
              'Allow Noobaa to connect to an external postgres server'
            )}
            isChecked={useExternalPostgres}
            onChange={() =>
              dispatch({
                type: 'backingStorage/useExternalPostgres',
                payload: !useExternalPostgres,
              })
            }
            className="odf-backing-store__radio--margin-bottom"
          />
        )}
        {useExternalPostgres && !hasOCS && (
          <PostgresConnectionDetails
            dispatch={dispatch}
            tlsFiles={[
              externalPostgres.tls.keys.private,
              externalPostgres.tls.keys.public,
            ]}
            tlsEnabled={externalPostgres.tls.enabled}
            allowSelfSignedCerts={externalPostgres.tls.allowSelfSignedCerts}
            username={externalPostgres.username}
            password={externalPostgres.password}
            serverName={externalPostgres.serverName}
            databaseName={externalPostgres.databaseName}
            port={externalPostgres.port}
            enableClientSideCerts={externalPostgres.tls.enableClientSideCerts}
          />
        )}
      </Form>
    </ErrorHandler>
  );
};

type BackingStorageProps = {
  dispatch: WizardDispatch;
  state: WizardState['backingStorage'];
  hasOCS: boolean;
  hasExternal: boolean;
  hasInternal: boolean;
  hasMultipleClusters: boolean;
  storageClass: WizardState['storageClass'];
  stepIdReached: WizardState['stepIdReached'];
  infraType: string;
  error: any;
  loaded: boolean;
  supportedExternalStorage: ExternalStorage[];
};
