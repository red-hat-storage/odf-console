import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import { getStorageClassDescription } from '@odf/core/utils';
import { getCephNodes } from '@odf/ocs/utils/common';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { LoadingInline } from '@odf/shared/generic/Loading';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { CommonModalProps } from '@odf/shared/modals/common';
import { ModalBody, ModalFooter, ModalHeader } from '@odf/shared/modals/Modal';
import { StorageClusterModel } from '@odf/shared/models';
import { PersistentVolumeModel, StorageClassModel } from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import {
  StorageClassResourceKind,
  StorageClusterKind,
  DeviceSet,
  StorageSystemKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  WatchK8sResource,
  k8sPatch,
  PrometheusEndpoint,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import classNames from 'classnames';
import { TFunction } from 'i18next';
import { Trans } from 'react-i18next';
import { compose } from 'redux';
import {
  FormGroup,
  TextInput,
  TextContent,
  Button,
  Modal,
  Alert,
  ModalVariant,
} from '@patternfly/react-core';
import {
  createWizardNodeState,
  getDeviceSetReplica,
} from '../../components/utils';
import {
  defaultRequestSize,
  NO_PROVISIONER,
  SIZE_IN_TB,
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
} from '../../utils/ocs';
import { PVsAvailableCapacity } from './pvs-available-capacity';
import './add-capacity-modal.scss';

type StorageClassDropdownProps = {
  onChange: any;
  'data-test': string;
  initialSelection: (args) => any;
  filter: (resource: StorageClassResourceKind) => StorageClassResourceKind;
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
  value % 1 ? (value * replica).toFixed(2) : value * replica;

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
      labelIcon={<FieldLevelHelp>{requestedCapacityTooltip(t)}</FieldLevelHelp>}
    >
      <div className="pf-v5-u-display-flex pf-v5-u-pt-sm pf-v5-u-pl-xs">
        <TextInput
          isDisabled
          id="request-size"
          className={classNames(
            'pf-v5-c-form-control',
            'ceph-add-capacity__input'
          )}
          type="number"
          name="requestSize"
          value={osdSizeWithoutUnit}
          aria-label="requestSize"
          data-test="requestSize"
        />
        <TextContent className="ceph-add-capacity__provisioned-capacity pf-v5-u-ml-xs">
          {' '}
          {t('x {{ replica, number }} replicas =', {
            replica,
          })}{' '}
          <strong data-test="provisioned-capacity">
            {provisionedCapacity}&nbsp;TiB
          </strong>
        </TextContent>
      </div>
    </FormGroup>
  );
};

type RawCapacityProps = {
  osdSizeWithoutUnit: number;
  replica: number;
  t: TFunction;
};

type AddSSCapacityModalProps = CommonModalProps & {
  storageSystem?: StorageSystemKind;
};

const AddSSCapacityModal: React.FC<AddSSCapacityModalProps> = ({
  extraProps: { resource: storageSystem },
  ...props
}) => {
  const [ocs, ocsLoaded, ocsError] = useK8sGet<StorageClusterKind>(
    StorageClusterModel,
    storageSystem.spec.name,
    storageSystem.spec.namespace
  );
  if (!ocsLoaded || ocsError) {
    return null;
  }

  return <AddCapacityModal storageCluster={ocs} {...props} />;
};

type AddCapacityModalProps = {
  storageCluster: StorageClusterKind;
} & CommonModalProps;

export const AddCapacityModal: React.FC<AddCapacityModalProps> = ({
  storageCluster: ocsConfig,
  closeModal,
  isOpen,
}) => {
  const { t } = useCustomTranslation();

  const ocsClusterNs = getNamespace(ocsConfig);
  const ocsClusterName = getName(ocsConfig);

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
  const [inProgress, setProgress] = React.useState(false);
  const [errorMessage, setError] = React.useState('');

  const deviceSets: DeviceSet[] = ocsConfig?.spec?.storageDeviceSets || [];
  const osdSizeWithUnit = getRequestedPVCSize(deviceSets?.[0]?.dataPVCTemplate);
  // ODF support Gi and Ti for any custome size
  const [osdSize, unit] = osdSizeWithUnit.split(/(\d+)/).filter(Boolean);
  const osdSizeWithoutUnit: number = +osdSize / SIZE_IN_TB[unit];
  const isNoProvionerSC: boolean = storageClass?.provisioner === NO_PROVISIONER;
  const selectedSCName: string = getName(storageClass);
  const deviceSetIndex: number = getCurrentDeviceSetIndex(
    deviceSets,
    selectedSCName
  );
  const hasFlexibleScaling = checkFlexibleScaling(ocsConfig);
  const isArbiterEnabled: boolean = checkArbiterCluster(ocsConfig);
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
      ? defaultRequestSize.BAREMETAL
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
        resource: ocsConfig,
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
            className="pf-v5-u-pt-md pf-v5-u-pb-sm"
            id="add-cap-sc-dropdown__FormGroup"
            fieldId="add-capacity-dropdown"
            label={t('StorageClass')}
            labelIcon={
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
                <TextContent className="ceph-add-capacity__current-capacity pf-v5-u-mt-sm">
                  {t('Currently Used:')}&nbsp;
                  {currentCapacity}
                </TextContent>
              </>
            ))}
          {errorMessage && (
            <Alert isInline variant="danger" title={t('An error occurred')}>
              {(errorMessage as any)?.message || errorMessage}
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
              isDisabled={isNoProvionerSC && (!availablePvsCount || nodesError)}
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

export default AddSSCapacityModal;
