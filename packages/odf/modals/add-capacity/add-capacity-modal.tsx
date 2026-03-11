import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import { getStorageClassDescription } from '@odf/core/utils';
import { getCephNodes } from '@odf/ocs/utils/common';
import { SingleSelectDropdown, useDeepCompareMemoize } from '@odf/shared';
import { OCS_OPERATOR, ROOK_CEPH_OPERATOR } from '@odf/shared/constants';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { LoadingInline } from '@odf/shared/generic/Loading';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { StorageClusterActionModalProps } from '@odf/shared/modals/common';
import { ModalBody, ModalFooter, ModalHeader } from '@odf/shared/modals/Modal';
import { DeploymentModel, StorageClusterModel } from '@odf/shared/models';
import { PersistentVolumeModel, StorageClassModel } from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import {
  StorageClassResourceKind,
  StorageClusterKind,
  DeviceSet,
  DeploymentKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getStorageSizeInTiBWithoutUnit,
  humanizeBinaryBytes,
  referenceForModel,
} from '@odf/shared/utils';
import {
  useK8sWatchResource,
  WatchK8sResource,
  k8sPatch,
  PrometheusEndpoint,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import classNames from 'classnames';
import { TFunction } from 'react-i18next';
import { Trans } from 'react-i18next';
import { compose } from 'redux';
import {
  FormGroup,
  TextInput,
  Content,
  Button,
  Alert,
  SelectOption,
} from '@patternfly/react-core';
import {
  createWizardNodeState,
  getDeviceSetReplica,
} from '../../components/utils';
import {
  DefaultRequestSize,
  deviceClassTooltip,
  NO_PROVISIONER,
  requestedCapacityTooltip,
  storageClassTooltip,
} from '../../constants';
import { CAPACITY_INFO_QUERIES, StorageDashboardQuery } from '../../queries';
import {
  checkArbiterCluster,
  checkFlexibleScaling,
  createDeviceSet,
  filterSC,
  getCurrentDeviceSetIndex,
  getDeviceSetCount,
  getRequestedPVCSize,
  getSCAvailablePVs,
  isArbiterSC,
  isValidTopology,
  NO_DEVICE_CLASS,
} from '../../utils/ocs';
import { PVsAvailableCapacity } from './pvs-available-capacity';
import './add-capacity-modal.scss';

type StorageClassDropdownProps = {
  onChange: any;
  'data-test': string;
  initialSelection: (args) => any;
  filter: (resource: StorageClassResourceKind) => StorageClassResourceKind;
};

type DeviceClassDropdownProps = {
  deviceClasses: string[];
  selectedDeviceClass: string;
  onChange: (deviceClass: string) => void;
  'data-test'?: string;
  placeholder?: string;
  className?: string;
};

export const StorageClassDropdown: React.FC<StorageClassDropdownProps> = ({
  onChange,
  'data-test': dataTest,
  initialSelection,
  filter,
}) => {
  return (
    <ResourceDropdown<StorageClassResourceKind>
      resource={scResource}
      resourceModel={StorageClassModel}
      showBadge
      secondaryTextGenerator={getStorageClassDescription}
      onSelect={onChange}
      initialSelection={initialSelection}
      filterResource={compose(filterSC, filter)}
      data-test={dataTest}
    />
  );
};

export const DeviceClassDropdown: React.FC<DeviceClassDropdownProps> = ({
  deviceClasses,
  selectedDeviceClass,
  onChange,
  'data-test': dataTest,
}) => {
  const { t } = useCustomTranslation();

  const deviceClassOptions = deviceClasses.map((cls) => (
    <SelectOption
      key={!cls ? NO_DEVICE_CLASS : cls}
      value={!cls ? NO_DEVICE_CLASS : cls}
    >
      {!cls ? t('None (no device class)') : cls}
    </SelectOption>
  ));

  return (
    <SingleSelectDropdown
      id="device-class"
      selectOptions={deviceClassOptions}
      selectedKey={selectedDeviceClass}
      onChange={onChange}
      placeholderText={t('Select device class')}
      className="ceph-add-capacity__device-class-dropdown"
      data-test={dataTest}
    />
  );
};

const useVerifyStorageClusterExpansionIsPossbile = (
  storageCluster: StorageClusterKind
): boolean => {
  const clusterNamespace = getNamespace(storageCluster);
  const deploymentResource: WatchK8sResource = {
    kind: DeploymentModel.kind,
    namespaced: true,
    isList: true,
    namespace: clusterNamespace,
  };
  const [deployments, isLoaded, loadError] =
    useK8sWatchResource<DeploymentKind[]>(deploymentResource);
  const isRookCephOperatorPresent =
    isLoaded &&
    !loadError &&
    deployments?.find(
      (deployment) => getName(deployment) === ROOK_CEPH_OPERATOR
    )?.status.replicas > 0;
  const isOCSOperatorPresent =
    isLoaded &&
    !loadError &&
    deployments?.find((deployment) => getName(deployment) === OCS_OPERATOR)
      ?.status.replicas > 0;
  if (!isLoaded || loadError) {
    return false;
  }
  return isRookCephOperatorPresent && isOCSOperatorPresent;
};

const scResource: WatchK8sResource = {
  kind: StorageClassModel.kind,
  namespaced: false,
  isList: true,
};

const pvResource: WatchK8sResource = {
  kind: PersistentVolumeModel.kind,
  namespaced: false,
  isList: true,
};

const getProvisionedCapacity = (value: number, replica: number) =>
  Number.isInteger(value * replica)
    ? value * replica
    : (value * replica).toFixed(2);

const RawCapacity: React.FC<RawCapacityProps> = ({
  t,
  osdSizeWithoutUnit,
  replica,
}) => {
  const provisionedCapacity = getProvisionedCapacity(
    osdSizeWithoutUnit,
    replica
  );
  return (
    <FormGroup
      fieldId="request-size"
      label={t('Raw Capacity')}
      labelHelp={<FieldLevelHelp>{requestedCapacityTooltip(t)}</FieldLevelHelp>}
    >
      <div className="pf-v6-u-display-flex pf-v6-u-pt-sm pf-v6-u-pl-xs">
        <TextInput
          isDisabled
          id="request-size"
          className={classNames(
            'pf-v6-c-form-control',
            'ceph-add-capacity__input'
          )}
          type="number"
          name="requestSize"
          value={osdSizeWithoutUnit}
          aria-label="requestSize"
          data-test="requestSize"
        />
        <Content className="ceph-add-capacity__provisioned-capacity pf-v6-u-ml-xs">
          {' '}
          {t('x {{ replica, number }} replicas =', {
            replica,
          })}{' '}
          <strong data-test="provisioned-capacity">
            {provisionedCapacity}&nbsp;TiB
          </strong>
        </Content>
      </div>
    </FormGroup>
  );
};

const getDeviceClassesForSC = (
  deviceSets: DeviceSet[],
  scName: string
): string[] =>
  deviceSets
    .filter((ds) => ds.dataPVCTemplate?.spec?.storageClassName === scName)
    .map((ds) => ds.deviceClass);

type RawCapacityProps = {
  osdSizeWithoutUnit: number;
  replica: number;
  t: TFunction;
};

const AddCapacityModal: React.FC<StorageClusterActionModalProps> = ({
  extraProps: { storageCluster: actionStorageCluster },
  closeModal,
  isOpen,
}) => {
  const { t } = useCustomTranslation();
  const isExpansionPossible =
    useVerifyStorageClusterExpansionIsPossbile(actionStorageCluster);

  const ocsClusterNs = getNamespace(actionStorageCluster);
  const ocsClusterName = getName(actionStorageCluster);
  const [storageCluster] = useK8sWatchResource<StorageClusterKind>({
    kind: referenceForModel(StorageClusterModel),
    name: ocsClusterName,
    namespace: ocsClusterNs,
  });
  const [cephTotal, totalError, totalLoading] = useCustomPrometheusPoll({
    endpoint: 'api/v1/query' as PrometheusEndpoint,
    query:
      CAPACITY_INFO_QUERIES(ocsClusterName)[
        StorageDashboardQuery.RAW_CAPACITY_TOTAL
      ],
    basePath: usePrometheusBasePath(),
  });
  const [cephUsed, usedError, usedLoading] = useCustomPrometheusPoll({
    endpoint: 'api/v1/query' as PrometheusEndpoint,
    query:
      CAPACITY_INFO_QUERIES(ocsClusterName)[
        StorageDashboardQuery.RAW_CAPACITY_USED
      ],
    basePath: usePrometheusBasePath(),
  });
  const [values, loading, loadError] = [
    [
      cephTotal?.data?.result?.[0]?.value?.[1],
      cephUsed?.data?.result?.[0]?.value?.[1],
    ],
    totalLoading || usedLoading,
    totalError || usedError,
  ];
  const [pvData, pvLoaded, pvLoadError] =
    useK8sWatchResource<K8sResourceCommon[]>(pvResource);
  const [nodesData, nodesLoaded, nodesLoadError] = useNodesData();
  const [scResources, scResourcesLoaded, scResourcesLoadError] =
    useK8sWatchResource<StorageClassResourceKind[]>(scResource);
  const [storageClass, setStorageClass] = React.useState(null);
  const [deviceClass, setDeviceClass] = React.useState('');
  const [inProgress, setProgress] = React.useState(false);
  const [errorMessage, setError] = React.useState('');

  const deviceSets = useDeepCompareMemoize(
    storageCluster?.spec?.storageDeviceSets || []
  );
  const osdSizeWithUnit = getRequestedPVCSize(deviceSets?.[0]?.dataPVCTemplate);
  const osdSizeWithoutUnit = getStorageSizeInTiBWithoutUnit(osdSizeWithUnit);
  const isNoProvionerSC: boolean = storageClass?.provisioner === NO_PROVISIONER;
  const selectedSCName: string = getName(storageClass);

  const hasFlexibleScaling = checkFlexibleScaling(storageCluster);
  const isArbiterEnabled: boolean = checkArbiterCluster(storageCluster);
  const replica = getDeviceSetReplica(
    isArbiterEnabled,
    hasFlexibleScaling,
    createWizardNodeState(getCephNodes(nodesData, ocsClusterNs) as NodeData[])
  );

  const totalCapacityMetric = values?.[0];
  const usedCapacityMetric = values?.[1];
  const usedCapacity = humanizeBinaryBytes(usedCapacityMetric);
  const totalCapacity = humanizeBinaryBytes(totalCapacityMetric);
  /** Name of the installation storageClass which will be the pre-selected value for the dropdown */
  const installStorageClass =
    deviceSets?.[0]?.dataPVCTemplate?.spec?.storageClassName;
  const nodesError: boolean =
    nodesLoadError || !(nodesData as []).length || !nodesLoaded;

  const preSelectionFilter = React.useCallback(
    (storageClasses: StorageClassResourceKind[]) =>
      storageClasses.find((sc) => getName(sc) === installStorageClass),
    [installStorageClass]
  );

  const deviceClasses = React.useMemo(
    () => getDeviceClassesForSC(deviceSets, selectedSCName),
    [deviceSets, selectedSCName]
  );
  const hasMultiDeviceClasses = deviceClasses.length > 1;

  React.useEffect(() => {
    if (deviceClasses.length === 1) {
      setDeviceClass(deviceClasses[0] || NO_DEVICE_CLASS);
    } else if (deviceClasses.length > 1) {
      // Multiple device classes - reset so user MUST choose from dropdown
      setDeviceClass('');
    }
  }, [deviceClasses]);

  const deviceSetIndex: number = getCurrentDeviceSetIndex(
    deviceSets,
    selectedSCName,
    deviceClass
  );

  // Stops users from moving from no-prov SC to prov SC. (Bug 2213183)
  const storageClassFilter = React.useCallback(
    (sc: StorageClassResourceKind) => {
      if (scResourcesLoaded && !scResourcesLoadError) {
        const initialSC = scResources?.find(
          (item) => getName(item) === installStorageClass
        );
        if (initialSC?.provisioner === NO_PROVISIONER) {
          return sc.provisioner === NO_PROVISIONER ? sc : undefined;
        }
      }
      return sc;
    },
    [installStorageClass, scResources, scResourcesLoadError, scResourcesLoaded]
  );

  const validateSC = React.useCallback(() => {
    if (!selectedSCName) return t('No StorageClass selected');
    if (!isNoProvionerSC || hasFlexibleScaling) return '';
    if (isArbiterEnabled && !isArbiterSC(selectedSCName, pvData, nodesData)) {
      return t(
        'The Arbiter stretch cluster requires a minimum of 4 nodes (2 different zones, 2 nodes per zone). Please choose a different StorageClass or create a new LocalVolumeSet that matches the minimum node requirement.'
      );
    }
    if (
      !isArbiterEnabled &&
      !isValidTopology(selectedSCName, pvData, nodesData)
    ) {
      return t(
        'The StorageCluster requires a minimum of 3 nodes. Please choose a different StorageClass or create a new LocalVolumeSet that matches the minimum node requirement.'
      );
    }
    return '';
  }, [
    selectedSCName,
    t,
    isNoProvionerSC,
    isArbiterEnabled,
    hasFlexibleScaling,
    pvData,
    nodesData,
  ]);

  let currentCapacity: React.ReactNode;
  let availablePvsCount: number = 0;

  if (!pvLoadError && pvData.length && pvLoaded) {
    const pvs: K8sResourceCommon[] = getSCAvailablePVs(pvData, selectedSCName);
    availablePvsCount = pvs.length;
  }

  if (loading) {
    currentCapacity = (
      <div className="skeleton-text ceph-add-capacity__current-capacity--loading" />
    );
  } else if (loadError || !totalCapacityMetric || !usedCapacityMetric) {
    currentCapacity = <div className="text-muted">{t('Not available')}</div>;
  } else {
    currentCapacity = (
      <div className="text-muted">
        <strong>{`${usedCapacity.string} / ${totalCapacity.string}`}</strong>
      </div>
    );
  }

  const submit = (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();
    setProgress(true);
    const patch = {
      op: '',
      path: '',
      value: null,
    };
    const osdSizeRequest = isNoProvionerSC
      ? DefaultRequestSize.BAREMETAL
      : osdSizeWithUnit;
    let portable = !isNoProvionerSC;
    let deviceSetReplica = replica;
    let deviceSetCount = 1;

    if (hasFlexibleScaling) {
      portable = false;
    }
    if (isNoProvionerSC)
      deviceSetCount = getDeviceSetCount(availablePvsCount, deviceSetReplica);

    if (deviceSetIndex === -1) {
      patch.op = 'add';
      patch.path = `/spec/storageDeviceSets/-`;
      patch.value = createDeviceSet(
        selectedSCName,
        osdSizeRequest,
        portable,
        deviceSetReplica,
        deviceSetCount
      );
    } else {
      patch.op = 'replace';
      patch.path = `/spec/storageDeviceSets/${deviceSetIndex}/count`;
      patch.value = deviceSets[deviceSetIndex].count + deviceSetCount;
    }

    const validation: string = validateSC();
    if (validation) {
      setError(validation);
      setProgress(false);
    } else {
      k8sPatch({
        model: StorageClusterModel,
        resource: storageCluster,
        data: [patch],
      })
        .then(() => {
          setProgress(false);
          closeModal();
        })
        .catch((err) => {
          setError(err);
          setProgress(false);
        });
    }
  };
  const Header = <ModalHeader>{t('Add Capacity')}</ModalHeader>;
  return (
    <Modal
      header={Header}
      isOpen={isOpen}
      onClose={closeModal}
      showClose={false}
      hasNoBodyWrapper={true}
      variant={ModalVariant.small}
      className="add-capacity-modal"
      aria-label="Add Capacity"
    >
      <NamespaceSafetyBox>
        <ModalBody className="add-capacity-modal--overflow">
          <Trans
            t={t as any}
            ns="plugin__odf-console"
            values={{ ocsClusterName }}
          >
            Adding capacity for <strong>{{ ocsClusterName }}</strong>, may
            increase your expenses.
          </Trans>
          <FormGroup
            className="pf-v6-u-pt-md pf-v6-u-pb-sm"
            id="add-cap-sc-dropdown__FormGroup"
            fieldId="add-capacity-dropdown"
            label={t('StorageClass')}
            labelHelp={
              <FieldLevelHelp>{storageClassTooltip(t)}</FieldLevelHelp>
            }
            isRequired
          >
            <div
              id="add-capacity-dropdown"
              className="ceph-add-capacity__sc-dropdown"
            >
              <StorageClassDropdown
                onChange={(sc: StorageClassResourceKind) => setStorageClass(sc)}
                data-test="add-cap-sc-dropdown"
                initialSelection={preSelectionFilter}
                filter={storageClassFilter}
              />
            </div>
            {!selectedSCName && (
              <div className="skeleton-text ceph-add-capacity__storage-class-dropdown--loading" />
            )}
          </FormGroup>
          {hasMultiDeviceClasses && (
            <FormGroup
              className="pf-v6-u-pt-md pf-v6-u-pb-sm"
              label={t('Device class')}
              fieldId="device-class"
              labelHelp={
                <FieldLevelHelp>{deviceClassTooltip(t)}</FieldLevelHelp>
              }
            >
              <DeviceClassDropdown
                deviceClasses={deviceClasses}
                selectedDeviceClass={deviceClass}
                onChange={setDeviceClass}
                data-test="add-cap-dc-dropdown"
              />
            </FormGroup>
          )}

          {!!selectedSCName &&
            (isNoProvionerSC ? (
              <PVsAvailableCapacity
                replica={replica}
                data-test-id="ceph-add-capacity-pvs-available-capacity"
                storageClass={storageClass}
                data={pvData}
                loaded={pvLoaded}
                loadError={pvLoadError}
              />
            ) : (
              <>
                {!!osdSizeWithoutUnit && (
                  <RawCapacity
                    t={t}
                    replica={replica}
                    osdSizeWithoutUnit={osdSizeWithoutUnit}
                  />
                )}
                <Content className="ceph-add-capacity__current-capacity pf-v6-u-mt-sm">
                  {t('Currently Used:')}&nbsp;
                  {currentCapacity}
                </Content>
              </>
            ))}
          {errorMessage && (
            <Alert isInline variant="danger" title={t('An error occurred')}>
              {(errorMessage as any)?.message || errorMessage}
            </Alert>
          )}
          {!isExpansionPossible && (
            <Alert
              isInline
              variant="danger"
              title={t('Add Capacity cannot proceed')}
            >
              {t(
                'The "Add Capacity" operation cannot proceed because one or more essential operators (rook-ceph or ocs-operator) are not running or scaled down. Ensure these operators are active and try again.'
              )}
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            key="cancel"
            variant="secondary"
            onClick={closeModal}
            data-test-id="modal-cancel-action"
          >
            {t('Cancel')}
          </Button>
          {!loading || !inProgress ? (
            <Button
              key="Add"
              data-test="modal-submit-action"
              data-test-id="confirm-action"
              variant="primary"
              onClick={submit}
              isDisabled={
                (isNoProvionerSC && (!availablePvsCount || nodesError)) ||
                !isExpansionPossible ||
                (hasMultiDeviceClasses && !deviceClass)
              }
            >
              {t('Add')}
            </Button>
          ) : (
            <LoadingInline />
          )}
        </ModalFooter>
      </NamespaceSafetyBox>
    </Modal>
  );
};

export default AddCapacityModal;
