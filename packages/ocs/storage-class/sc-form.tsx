import * as React from 'react';
import {
  reducer,
  initialState,
} from '@odf/core/components/create-storage-system/reducer';
import { KMSConfigure } from '@odf/core/components/kms-config/kms-config';
import {
  isLengthUnity,
  createCsiKmsResources,
} from '@odf/core/components/kms-config/utils';
import {
  KMS_PROVIDER,
  KMSConfigMapCSIName,
  SupportedProviders,
  DescriptionKey,
} from '@odf/core/constants';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import {
  useODFNamespaceSelector,
  useODFSystemFlagsSelector,
} from '@odf/core/redux';
import {
  getCephBlockPoolResource,
  cephClusterResource,
} from '@odf/core/resources';
import {
  ProviderNames,
  KmsCsiConfigKeysMapping,
  KMSConfigMap,
  K8sResourceObj,
} from '@odf/core/types';
import { getResourceInNs } from '@odf/core/utils';
import { CephFileSystemModel } from '@odf/shared';
import { DEFAULT_INFRASTRUCTURE } from '@odf/shared/constants';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import {
  ConfigMapModel,
  InfrastructureModel,
  StorageClassModel,
  SecretModel,
  StorageClusterModel,
  ODFStorageSystem,
} from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import {
  CephClusterKind,
  ConfigMapKind,
  K8sResourceKind,
  StorageClassResourceKind,
  SecretKind,
  InfrastructureKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { isOCSStorageSystem, referenceForModel } from '@odf/shared/utils';
import { getInfrastructurePlatform, isNotFoundError } from '@odf/shared/utils';
import {
  ProvisionerProps,
  useK8sWatchResource,
  useModal,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import {
  Alert,
  FormGroup,
  Checkbox,
  Card,
  Button,
  Form,
  Radio,
  ActionGroup,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  Divider,
} from '@patternfly/react-core';
import { AddCircleOIcon } from '@patternfly/react-icons';
import {
  ClusterStatus,
  PoolState,
  CEPH_NS_SESSION_STORAGE,
  PoolType,
} from '../constants';
import { CreateStoragePoolModal } from '../modals/storage-pool/create-storage-pool-modal';
import { CephFilesystemKind, StoragePool, StoragePoolKind } from '../types';
import '../style.scss';
import './sc-form.scss';
import {
  getExistingBlockPoolNames,
  getExistingFsPoolNames,
  getStoragePoolsFromBlockPools,
  getStoragePoolsFromFilesystem,
} from '../utils';

type OnParamChange = (id: string, paramName: string, checkbox: boolean) => void;

const storageClusterResource: WatchK8sResource = {
  kind: referenceForModel(StorageClusterModel),
  isList: true,
};

const filterOCSStorageSystems = (resource) => isOCSStorageSystem(resource);

const setSessionStorageSystemNamespace = (systemNamespace: string) => {
  // session value will get removed after clicking "Create" (check "mutators.ts"),
  // so in case of any error (after clicking "Create") form persists but session gets removed.
  const sessionNsValue = sessionStorage.getItem(CEPH_NS_SESSION_STORAGE);
  if (!sessionNsValue && !!systemNamespace)
    sessionStorage.setItem(CEPH_NS_SESSION_STORAGE, systemNamespace);
};

const getPoolDropdownItems = (
  poolData: StoragePool[],
  cephCluster,
  handleDropdownChange,
  onPoolCreation,
  launchModal,
  t,
  defaultDeviceClass: string,
  poolType: PoolType,
  existingNames: string[],
  filesystemName = ''
) =>
  _.reduce(
    poolData,
    (res, pool: StoragePool) => {
      const compressionMode = pool?.spec?.compressionMode;
      const isCompressionEnabled: boolean =
        !!compressionMode && compressionMode !== 'none';
      const compressionText = !isCompressionEnabled
        ? t('no compression')
        : t('with compression');
      if (
        pool?.status?.phase === PoolState.READY &&
        cephCluster?.status?.phase === ClusterStatus.READY
      ) {
        res.push(
          <DropdownItem
            key={pool?.metadata?.name}
            component="button"
            id={pool?.metadata?.name}
            data-test={pool?.metadata?.name}
            onClick={handleDropdownChange}
            description={t('Replica {{poolSize}} {{compressionText}}', {
              poolSize: pool?.spec?.replicated?.size,
              compressionText,
            })}
          >
            {pool?.metadata?.name}
          </DropdownItem>
        );
      }
      return res;
    },
    [
      <DropdownItem
        data-test="create-new-pool-button"
        key="first-item"
        component="button"
        onClick={() =>
          launchModal(CreateStoragePoolModal, {
            cephCluster,
            onPoolCreation,
            defaultDeviceClass,
            poolType,
            existingNames,
            filesystemName,
          })
        }
      >
        <span className="ocs-storage-class__pool--create">
          <AddCircleOIcon className="pf-v6-u-mr-sm" />
          {t('Create new storage pool')}
        </span>
      </DropdownItem>,
      <Divider key="separator" />,
    ]
  );

const StorageSystemDropdown: React.FC<{
  onSelect: (resource: K8sResourceKind) => void;
  systemNamespace: string;
}> = ({ onSelect, systemNamespace }) => {
  const { t } = useCustomTranslation();

  const initialSSSelection = React.useCallback(
    (resources) => {
      return !systemNamespace
        ? resources?.[0]
        : resources?.find((system) => getNamespace(system) === systemNamespace);
    },
    [systemNamespace]
  );

  return (
    <div className="form-group">
      <label htmlFor="system-name" className="co-required">
        {t('Storage system')}
      </label>
      <ResourceDropdown<K8sResourceKind>
        className="pf-v6-c-dropdown dropdown--full-width"
        onSelect={onSelect}
        initialSelection={initialSSSelection}
        filterResource={filterOCSStorageSystems}
        id="system-name"
        data-test="storage-system-dropdown"
        resource={storageClusterResource}
        resourceModel={ODFStorageSystem}
      />
      <span className="help-block">
        {t('Select a storage system for your workloads.')}
      </span>
    </div>
  );
};

export const CephFsNameComponent: React.FC<ProvisionerProps> = ({
  parameterKey,
  parameterValue,
  onParamChange,
}) => {
  const { t } = useCustomTranslation();
  const [systemNamespace, setSystemNamespace] = React.useState<string>();
  const onParamChangeRef = React.useRef<OnParamChange>();
  // reference of "onParamChange" changes on each re-render, hence storing in a "useRef"
  onParamChangeRef.current = onParamChange;

  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();
  const isExternal = systemFlags[systemNamespace]?.isExternalMode;
  const ocsName = systemFlags[systemNamespace]?.ocsClusterName;
  const scName = `${ocsName}-cephfs`;

  const [sces, scLoaded, scLoadError] =
    useK8sList<StorageClassResourceKind>(StorageClassModel);
  const sc = sces?.find((item) => getName(item) === scName);

  React.useEffect(() => {
    if (!!sc && scLoaded && !scLoadError) {
      // Get the default filesystem name from StorageClass.
      const fsName = sc?.parameters?.fsName;
      if (fsName) {
        onParamChangeRef.current(parameterKey, fsName, false);
      }
    }

    return () => onParamChangeRef.current(parameterKey, '', false);
  }, [sc, scLoaded, scLoadError, parameterKey]);

  const onSelect = React.useCallback(
    (resource: K8sResourceKind) => {
      const ns = getNamespace(resource);
      sessionStorage.setItem(CEPH_NS_SESSION_STORAGE, ns);
      setSystemNamespace(ns);
    },
    [setSystemNamespace]
  );

  setSessionStorageSystemNamespace(systemNamespace);

  if (scLoaded && areFlagsLoaded && !scLoadError && !flagsLoadError) {
    return (
      <>
        <StorageSystemDropdown
          onSelect={onSelect}
          systemNamespace={systemNamespace}
        />
        <div className="form-group">
          <label htmlFor="filesystem-name" className="co-required">
            {t('Filesystem name')}
          </label>
          <input
            className="pf-v6-c-form-control"
            type="text"
            value={parameterValue}
            disabled={!isExternal}
            onChange={(e) => {
              onParamChange(parameterKey, e.currentTarget.value, false);
            }}
            placeholder={t('Enter filesystem name')}
            id="filesystem-name"
            required
          />
          <span className="help-block">
            {t('CephFS filesystem name into which the volume shall be created')}
          </span>
        </div>
      </>
    );
  }
  return (
    <StatusBox
      loadError={scLoadError || flagsLoadError}
      loaded={scLoaded && areFlagsLoaded}
    />
  );
};

export const CephFsPoolComponent: React.FC<ProvisionerProps> = ({
  parameterKey,
  parameterValue,
  onParamChange,
}) => {
  const { t } = useCustomTranslation();
  const onParamChangeRef = React.useRef<OnParamChange>();
  // reference of "onParamChange" changes on each re-render, hence storing in a "useRef"
  onParamChangeRef.current = onParamChange;

  const launchModal = useModal();

  const [isOpen, setOpen] = React.useState(false);

  const [cephClusters, cephClustersLoaded, cephClustersLoadError] =
    useK8sWatchResource<CephClusterKind[]>(cephClusterResource);

  const { systemFlags, areFlagsLoaded, flagsLoadError, areFlagsSafe } =
    useODFSystemFlagsSelector();

  const systemNamespace = sessionStorage.getItem(CEPH_NS_SESSION_STORAGE);
  const filesystemName = `${systemFlags[systemNamespace]?.ocsClusterName}-cephfilesystem`;

  // We read pools from CephFilesystem as it's the only resource where the default pool appears
  // (unlike in StorageCluster CR).
  const [fsData, fsDataLoaded, fsDataLoadError] =
    useK8sWatchResource<CephFilesystemKind>({
      kind: referenceForModel(CephFileSystemModel),
      isList: false,
      name: filesystemName,
      namespace: systemNamespace,
    });

  const cephCluster = getResourceInNs(cephClusters, systemNamespace);

  const isExternal = systemFlags[systemNamespace]?.isExternalMode;

  const isLoaded = areFlagsLoaded && cephClustersLoaded;
  const loadError = flagsLoadError || cephClustersLoadError;

  const handleDropdownChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onParamChange(parameterKey, e.currentTarget.id, false);
  };

  const onPoolCreation = (name: string) => {
    onParamChange(parameterKey, name, false);
  };
  const onPoolInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onParamChange(parameterKey, e.currentTarget.value, false);
  };

  // Collect existing pool names to check against new pool name.
  const poolData = getStoragePoolsFromFilesystem(fsData) || [];
  const existingNames = getExistingFsPoolNames(fsData);

  const poolToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      id="pool-dropdown-id"
      data-test="pool-dropdown-toggle"
      onClick={() => setOpen(!isOpen)}
      isExpanded={isOpen}
      isFullWidth
    >
      {parameterValue || t('Select a Pool')}
    </MenuToggle>
  );

  if (areFlagsSafe && isLoaded && !loadError) {
    if (!isExternal && fsDataLoaded && !fsDataLoadError) {
      return (
        <div className="form-group">
          <label className="co-required" htmlFor="ocs-storage-pool">
            {t('Storage Pool')}
          </label>
          <Dropdown
            isOpen={isOpen}
            onSelect={() => setOpen(false)}
            onOpenChange={(open: boolean) => setOpen(open)}
            toggle={poolToggle}
            popperProps={{ width: 'trigger' }}
          >
            <DropdownList>
              {getPoolDropdownItems(
                poolData,
                cephCluster,
                handleDropdownChange,
                onPoolCreation,
                launchModal,
                t,
                '',
                PoolType.FILESYSTEM,
                existingNames,
                filesystemName
              )}
            </DropdownList>
          </Dropdown>
          <span className="help-block">
            {t('Storage pool into which volume data shall be stored')}
          </span>
        </div>
      );
    }
    if (isExternal) {
      return (
        <div className="form-group">
          <label className="co-required" htmlFor="pool-name">
            {t('Storage Pool')}
          </label>
          <input
            className="pf-v6-c-form-control"
            type="text"
            onChange={onPoolInput}
            value={parameterValue}
            placeholder={t('my-storage-pool')}
            aria-describedby={t('pool-name-help')}
            id="pool-name"
            name="newPoolName"
            required
          />
          <span className="help-block">
            {t('Storage pool into which volume data shall be stored')}
          </span>
        </div>
      );
    }
  }
  return (
    <StatusBox
      loaded={isLoaded && fsDataLoaded}
      loadError={loadError || fsDataLoadError}
    />
  );
};

export const BlockPoolResourceComponent: React.FC<ProvisionerProps> = ({
  parameterKey,
  onParamChange,
}) => {
  const { t } = useCustomTranslation();
  const onParamChangeRef = React.useRef<OnParamChange>();
  // reference of "onParamChange" changes on each re-render, hence storing in a "useRef"
  onParamChangeRef.current = onParamChange;

  const launchModal = useModal();

  const [cephClusters, cephClustersLoaded, cephClustersLoadError] =
    useK8sWatchResource<CephClusterKind[]>(cephClusterResource);

  const [isOpen, setOpen] = React.useState(false);
  const [poolName, setPoolName] = React.useState('');
  const [systemNamespace, setSystemNamespace] = React.useState<string>();

  const cephCluster = getResourceInNs(cephClusters, systemNamespace);

  const { systemFlags, areFlagsLoaded, flagsLoadError, areFlagsSafe } =
    useODFSystemFlagsSelector();
  const isExternal = systemFlags[systemNamespace]?.isExternalMode;

  const poolNs = getNamespace(cephCluster);
  const clusterName = systemFlags[poolNs]?.ocsClusterName;
  const defaultPoolName = `${clusterName}-cephblockpool`;
  const [poolsData, poolDataLoaded, poolDataLoadError] = useK8sWatchResource<
    StoragePoolKind[]
  >(getCephBlockPoolResource(clusterName));
  const filteredPools = poolsData?.filter(
    (pool) => getNamespace(pool) === systemNamespace
  );

  // Collect existing pool names to check against new pool name.
  const poolData = getStoragePoolsFromBlockPools(filteredPools) || [];
  const existingNames = getExistingBlockPoolNames(poolData);

  // Get the default deviceClass required by the 'create' modal.
  const defaultPool = filteredPools.find(
    (pool: StoragePoolKind) => pool.metadata.name === defaultPoolName
  );
  const defaultDeviceClass = defaultPool?.spec?.deviceClass || '';

  const handleDropdownChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setPoolName(e.currentTarget.id);
    onParamChange(parameterKey, e.currentTarget.id, false);
  };

  const onPoolCreation = (name: string) => {
    setPoolName(name);
    onParamChange(parameterKey, name, false);
  };

  const onPoolInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPoolName(e.currentTarget.value);
    onParamChange(parameterKey, e.currentTarget.value, false);
  };

  const onSelect = React.useCallback(
    (resource: K8sResourceKind) => {
      const ns = getNamespace(resource);
      sessionStorage.setItem(CEPH_NS_SESSION_STORAGE, ns);
      setSystemNamespace(ns);
      setPoolName('');
      onParamChangeRef.current(parameterKey, '', false);
    },
    [setSystemNamespace, setPoolName, parameterKey]
  );

  setSessionStorageSystemNamespace(systemNamespace);

  const blockPoolToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      id="pool-dropdown-id"
      data-test="pool-dropdown-toggle"
      onClick={() => setOpen(!isOpen)}
      isExpanded={isOpen}
      isFullWidth
    >
      {poolName || t('Select a Pool')}
    </MenuToggle>
  );

  if (areFlagsSafe && !isExternal) {
    return (
      <>
        {!poolDataLoadError && !flagsLoadError && (
          <>
            <StorageSystemDropdown
              onSelect={onSelect}
              systemNamespace={systemNamespace}
            />
            <div className="form-group">
              <label className="co-required" htmlFor="ocs-storage-pool">
                {t('Storage Pool')}
              </label>
              <Dropdown
                isOpen={isOpen}
                onSelect={() => setOpen(false)}
                onOpenChange={(open: boolean) => setOpen(open)}
                toggle={blockPoolToggle}
                popperProps={{ width: 'trigger' }}
              >
                <DropdownList>
                  {getPoolDropdownItems(
                    poolData,
                    cephCluster,
                    handleDropdownChange,
                    onPoolCreation,
                    launchModal,
                    t,
                    defaultDeviceClass,
                    PoolType.BLOCK,
                    existingNames
                  )}
                </DropdownList>
              </Dropdown>
              <span className="help-block">
                {t('Storage pool into which volume data shall be stored')}
              </span>
            </div>
          </>
        )}
        {(poolDataLoadError || cephClustersLoadError || flagsLoadError) && (
          <Alert
            className="co-alert"
            variant="danger"
            title={t('Error retrieving parameters')}
            isInline
          />
        )}
      </>
    );
  }
  if (areFlagsSafe && isExternal) {
    return (
      <>
        <StorageSystemDropdown
          onSelect={onSelect}
          systemNamespace={systemNamespace}
        />
        <div className="form-group">
          <label className="co-required" htmlFor="pool-name">
            {t('Storage Pool')}
          </label>
          <input
            className="pf-v6-c-form-control"
            type="text"
            onChange={onPoolInput}
            value={poolName}
            placeholder={t('my-storage-pool')}
            aria-describedby={t('pool-name-help')}
            id="pool-name"
            name="newPoolName"
            required
          />
          <span className="help-block">
            {t('Storage pool into which volume data shall be stored')}
          </span>
        </div>
      </>
    );
  }
  return (
    <StatusBox
      loadError={cephClustersLoadError || poolDataLoadError || flagsLoadError}
      loaded={cephClustersLoaded && poolDataLoaded && areFlagsLoaded}
    />
  );
};

const StorageClassEncryptionLabel: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <div className="ocs-storage-class-encryption__pv-title">
      <span className="ocs-storage-class-encryption__pv-title--padding">
        {t('Enable Encryption')}
      </span>
    </div>
  );
};

export const StorageClassEncryption: React.FC<ProvisionerProps> = ({
  parameterKey,
  onParamChange,
}) => {
  const { t } = useCustomTranslation();

  const [checked, isChecked] = React.useState(false);

  const setChecked = (value: boolean) => {
    onParamChange(parameterKey, value.toString(), false);
    isChecked(value);
  };

  return (
    <div className="ocs-storage-class__form">
      <Form>
        {/* Add form validation again */}
        <FormGroup fieldId="storage-class-encryption" isRequired>
          <Checkbox
            id="storage-class-encryption"
            isChecked={checked}
            data-checked-state={checked}
            label={<StorageClassEncryptionLabel />}
            aria-label={t('StorageClass encryption')}
            onChange={(_event, checkedArg) => setChecked(checkedArg)}
            className="ocs-storage-class-encryption__form-checkbox"
            data-test="storage-class-encryption"
          />
          <span className="help-block">
            {t(
              'An encryption key will be generated for each PersistentVolume created using this StorageClass.'
            )}
          </span>
        </FormGroup>
      </Form>
    </div>
  );
};

const ExistingKMSDropDown: React.FC<ExistingKMSDropDownProps> = ({
  csiConfigMap,
  serviceName,
  kmsProvider,
  infraType,
  secrets,
  setEncryptionId,
}) => {
  const { t } = useCustomTranslation();

  const [isProviderOpen, setProviderOpen] = React.useState(false);
  const [isServiceOpen, setServiceOpen] = React.useState(false);
  const [provider, setProvider] = React.useState<string>(kmsProvider);
  const [kmsServiceDropdownItems, setKmsServiceDropdownItems] = React.useState<
    JSX.Element[]
  >([]);

  const handleProviderDropdownChange = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    setProvider(e.currentTarget.id);
    setEncryptionId('');
  };

  const kmsProviderDropdownItems = _.reduce(
    SupportedProviders,
    (res, providerDetails, providerName) => {
      if (
        !SupportedProviders[providerName].allowedPlatforms ||
        SupportedProviders[providerName]?.allowedPlatforms.includes(infraType)
      )
        res.push(
          <DropdownItem
            key={providerDetails.group}
            component="button"
            id={providerName}
            data-test={providerDetails.group}
            onClick={handleProviderDropdownChange}
          >
            {providerDetails.group}
          </DropdownItem>
        );
      return res;
    },
    []
  );

  React.useEffect(() => {
    const handleServiceDropdownChange = (
      e: React.KeyboardEvent<HTMLInputElement>
    ) => setEncryptionId(e.currentTarget.id);
    setKmsServiceDropdownItems(
      _.reduce(
        csiConfigMap?.data,
        (res, connectionDetails, connectionName) => {
          try {
            // removing any object having syntax error
            // or, which are not supported by UI.
            const kmsData: KMSConfigMap = JSON.parse(connectionDetails);

            // Todo: will remove this once we we completly moved to camelcase
            const kmsProviderName =
              kmsData?.[KMS_PROVIDER] ??
              kmsData?.[KmsCsiConfigKeysMapping[KMS_PROVIDER]];
            const kmsDescriptionKey = DescriptionKey[kmsProviderName];
            const filterFunction = SupportedProviders[provider]?.filter;

            if (
              SupportedProviders[provider].supported.includes(
                kmsProviderName
              ) &&
              (!filterFunction || !filterFunction(kmsData, secrets))
            ) {
              res.push(
                <DropdownItem
                  key={connectionName}
                  component="button"
                  id={connectionName}
                  data-test={connectionName}
                  onClick={handleServiceDropdownChange}
                  description={
                    kmsData?.[kmsDescriptionKey] ??
                    kmsData?.[KmsCsiConfigKeysMapping[kmsDescriptionKey]]
                  }
                >
                  {connectionName}
                </DropdownItem>
              );
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err);
          }
          return res;
        },
        []
      )
    );
  }, [provider, csiConfigMap, secrets, setEncryptionId]);

  const providerToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      id="kms-provider-dropdown-id"
      data-test="kms-provider-dropdown-toggle"
      onClick={() => setProviderOpen(!isProviderOpen)}
      isExpanded={isProviderOpen}
      isDisabled={isLengthUnity(kmsProviderDropdownItems)}
      isFullWidth
    >
      {SupportedProviders[provider].group}
    </MenuToggle>
  );

  const serviceToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      id="kms-service-dropdown-id"
      data-test="kms-service-dropdown-toggle"
      onClick={() => setServiceOpen(!isServiceOpen)}
      isExpanded={isServiceOpen}
      isFullWidth
    >
      {serviceName || t('Select an existing connection')}
    </MenuToggle>
  );

  return (
    <div className="ocs-storage-class-encryption__form-dropdown--padding">
      <div className="form-group">
        <label htmlFor="kms-provider">{t('Provider')}</label>
        <Dropdown
          isOpen={isProviderOpen}
          onSelect={() => setProviderOpen(false)}
          onOpenChange={(open: boolean) => setProviderOpen(open)}
          toggle={providerToggle}
          popperProps={{ width: 'trigger' }}
        >
          <DropdownList>{kmsProviderDropdownItems}</DropdownList>
        </Dropdown>
      </div>
      <div className="form-group">
        <label htmlFor="kms-service">{t('Key service')}</label>
        <Dropdown
          isOpen={isServiceOpen}
          onSelect={() => setServiceOpen(false)}
          onOpenChange={(open: boolean) => setServiceOpen(open)}
          toggle={serviceToggle}
          popperProps={{ width: 'trigger' }}
        >
          <DropdownList>{kmsServiceDropdownItems}</DropdownList>
        </Dropdown>
      </div>
    </div>
  );
};

const csiCMWatchResource: K8sResourceObj = (ns: string) => ({
  kind: ConfigMapModel.kind,
  namespaced: true,
  isList: false,
  namespace: ns,
  name: KMSConfigMapCSIName,
});

const secretResource: K8sResourceObj = (ns: string) => ({
  isList: true,
  kind: SecretModel.kind,
  namespace: ns,
});

export const StorageClassEncryptionKMSID: React.FC<ProvisionerProps> = ({
  parameterKey,
  onParamChange,
}) => {
  const { t } = useCustomTranslation();
  const onParamChangeRef = React.useRef<OnParamChange>();
  // reference of "onParamChange" changes on each re-render, hence storing in a "useRef"
  onParamChangeRef.current = onParamChange;

  const { odfNamespace, isODFNsLoaded, odfNsLoadError } =
    useODFNamespaceSelector();

  const [state, dispatch] = React.useReducer(reducer, initialState);
  const [isExistingKms, setIsExistingKms] = React.useState<boolean>(true);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [progress, setInProgress] = React.useState<boolean>(false);
  const [serviceName, setServiceName] = React.useState<string>('');

  const { kms, encryption } = state.securityAndNetwork;
  const { provider } = kms;

  if (!encryption.storageClass) {
    dispatch({
      type: 'securityAndNetwork/setEncryption',
      payload: {
        ...encryption,
        storageClass: true,
      },
    });
  }

  const [infra, infraLoaded, infraLoadError] = useK8sGet<InfrastructureKind>(
    InfrastructureModel,
    DEFAULT_INFRASTRUCTURE
  );
  const [csiConfigMap, csiConfigMapLoaded, csiConfigMapLoadError] =
    useSafeK8sWatchResource<ConfigMapKind>(csiCMWatchResource);
  const [secrets, secretsLoaded, secretsLoadError] =
    useSafeK8sWatchResource<SecretKind[]>(secretResource);

  const infraType = getInfrastructurePlatform(infra);
  const memoizedCsiConfigMap = useDeepCompareMemoize(csiConfigMap, true);

  const setEncryptionId = React.useCallback(
    (encryptionId: string) => {
      setServiceName(encryptionId);
      onParamChangeRef.current(parameterKey, encryptionId, false);
    },
    [parameterKey]
  );

  /** When csiConfigMap is deleted from another tab, "csiConfigMapLoadError" == true (404 Not Found), but,
   * "csiConfigMap" still contains same old object that was present before the deletion of the configMap.
   * Hence, dropdown was not updating dynamically. Used "csiKmsDetails" to handle that.
   */
  const [csiKmsDetails, setCsiKmsDetails] = React.useState<ConfigMapKind>(null);
  React.useEffect(() => {
    if (csiConfigMapLoaded && !csiConfigMapLoadError && memoizedCsiConfigMap) {
      setCsiKmsDetails(memoizedCsiConfigMap);
    } else if (csiConfigMapLoadError) {
      setIsExistingKms(false);
      setCsiKmsDetails(null);
      setEncryptionId('');
    }
  }, [
    memoizedCsiConfigMap,
    csiConfigMapLoaded,
    csiConfigMapLoadError,
    setIsExistingKms,
    setEncryptionId,
  ]);

  const updateKMS = async () => {
    setInProgress(true);
    const allServiceNames = csiKmsDetails
      ? Object.keys(csiKmsDetails?.data)
      : [];
    if (
      (allServiceNames.length &&
        allServiceNames.indexOf(kms.providerState.name.value) === -1) ||
      !csiKmsDetails
    ) {
      try {
        const promises: Promise<K8sResourceKind>[] = createCsiKmsResources(
          kms.providerState,
          !!csiKmsDetails,
          odfNamespace,
          provider
        );
        await Promise.all(promises).then(() => {
          setIsExistingKms(true);
          setEncryptionId(kms.providerState.name.value);
        });
        setErrorMessage('');
      } catch (error) {
        setErrorMessage(error.message);
      }
    } else {
      setErrorMessage(
        t('KMS service {{value}} already exist', {
          value: kms.providerState.name.value,
        })
      );
    }
    setInProgress(false);
  };

  if (
    (!csiConfigMapLoaded && !csiConfigMapLoadError) ||
    !infraLoaded ||
    infraLoadError ||
    !secretsLoaded ||
    secretsLoadError ||
    !isODFNsLoaded ||
    odfNsLoadError
  ) {
    return (
      <StatusBox
        loadError={
          infraLoadError ||
          (!isNotFoundError(csiConfigMapLoadError) && csiConfigMapLoadError) ||
          secretsLoadError ||
          odfNsLoadError
        }
        loaded={
          infraLoaded && csiConfigMapLoaded && secretsLoaded && isODFNsLoaded
        }
      />
    );
  }
  return (
    <Form className="ocs-storage-class-encryption__form--padding">
      <FormGroup fieldId="rbd-sc-kms-connection-selector">
        <div id="rbd-sc-kms-connection-selector">
          <Radio
            label={t('Choose existing KMS connection')}
            name="kms-selection"
            id="choose-existing-kms-connection"
            className="ocs-storage-class-encryption__form-radio"
            onClick={() => setIsExistingKms(true)}
            checked={isExistingKms}
          />
          {isExistingKms && (
            <ExistingKMSDropDown
              csiConfigMap={csiKmsDetails}
              serviceName={serviceName}
              kmsProvider={provider}
              infraType={infraType}
              secrets={secrets}
              setEncryptionId={setEncryptionId}
            />
          )}
          <Radio
            label={t('Create new KMS connection')}
            name="kms-selection"
            id="create-new-kms-connection"
            className="ocs-storage-class-encryption__form-radio"
            onClick={() => setIsExistingKms(false)}
            checked={!isExistingKms}
            data-test={`sc-form-new-kms-radio`}
          />
          {!isExistingKms && (
            <Card className="ocs-storage-class-encryption__card">
              <KMSConfigure
                state={state.securityAndNetwork}
                dispatch={dispatch}
                infraType={infraType}
                systemNamespace={odfNamespace}
                className="ocs-storage-class-encryption"
              />
              <div className="ocs-install-kms__save-button">
                <ButtonBar errorMessage={errorMessage} inProgress={progress}>
                  <ActionGroup>
                    <Button
                      variant="secondary"
                      onClick={updateKMS}
                      isDisabled={!kms.providerState.hasHandled}
                      data-test="save-action"
                    >
                      {t('Save')}
                    </Button>
                  </ActionGroup>
                </ButtonBar>
              </div>
            </Card>
          )}
        </div>
      </FormGroup>
    </Form>
  );
};

type ExistingKMSDropDownProps = {
  csiConfigMap: ConfigMapKind;
  serviceName: string;
  kmsProvider: ProviderNames;
  infraType: string;
  secrets: SecretKind[];
  setEncryptionId: (encryptionId: string) => void;
};
