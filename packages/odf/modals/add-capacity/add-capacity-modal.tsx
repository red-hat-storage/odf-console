import * as React from 'react';
import { getStorageClassDescription } from '@odf/core/utils';
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
import {
  NodeModel,
  PersistentVolumeModel,
  StorageClassModel,
} from '@odf/shared/models';
import { OCSStorageClusterModel } from '@odf/shared/models';
import {
  StorageClassResourceKind,
  NodeKind,
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
  defaultRequestSize,
  NO_PROVISIONER,
  OCS_DEVICE_SET_ARBITER_REPLICA,
  OCS_DEVICE_SET_REPLICA,
  OSD_CAPACITY_SIZES,
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
};

const StorageClassDropdown: React.FC<StorageClassDropdownProps> = ({
  onChange,
  'data-test': dataTest,
  initialSelection,
}) => {
  return (
    <ResourceDropdown<StorageClassResourceKind>
      resource={scResource}
      resourceModel={StorageClassModel}
      showBadge
      secondaryTextGenerator={getStorageClassDescription}
      onSelect={onChange}
      initialSelection={initialSelection}
      filterResource={filterSC}
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

const nodeResource: WatchK8sResource = {
  kind: NodeModel.kind,
  namespaced: false,
  isList: true,
};

const getProvisionedCapacity = (value: number) =>
  value % 1 ? (value * 3).toFixed(2) : value * 3;

const RawCapacity: React.FC<RawCapacityProps> = ({
  t,
  osdSizeWithoutUnit,
  replica,
}) => {
  const provisionedCapacity = getProvisionedCapacity(osdSizeWithoutUnit);
  return (
    <>
      <FormGroup
        fieldId="request-size"
        label={t('Raw Capacity')}
        labelIcon={
          <FieldLevelHelp>{requestedCapacityTooltip(t)}</FieldLevelHelp>
        }
      >
        <TextInput
          isDisabled
          id="request-size"
          className={classNames(
            'pf-c-form-control',
            'ceph-add-capacity__input'
          )}
          type="number"
          name="requestSize"
          value={osdSizeWithoutUnit}
          aria-label="requestSize"
          data-test="requestSize"
        />
        <TextContent className="ceph-add-capacity__provisioned-capacity">
          {' '}
          {t('x {{ replica, number }} replicas =', {
            replica,
          })}{' '}
          <strong data-test="provisioned-capacity">
            {provisionedCapacity}&nbsp;TiB
          </strong>
        </TextContent>
      </FormGroup>
    </>
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
    OCSStorageClusterModel,
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

const AddCapacityModal: React.FC<AddCapacityModalProps> = ({
  storageCluster: ocsConfig,
  closeModal,
  isOpen,
}) => {
  const { t } = useCustomTranslation();

  const [cephTotal, totalError, totalLoading] = useCustomPrometheusPoll({
    endpoint: 'api/v1/query' as PrometheusEndpoint,
    query: CAPACITY_INFO_QUERIES[StorageDashboardQuery.RAW_CAPACITY_TOTAL],
    basePath: usePrometheusBasePath(),
  });
  const [cephUsed, usedError, usedLoading] = useCustomPrometheusPoll({
    endpoint: 'api/v1/query' as PrometheusEndpoint,
    query: CAPACITY_INFO_QUERIES[StorageDashboardQuery.RAW_CAPACITY_USED],
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
  const [nodesData, nodesLoaded, nodesLoadError] =
    useK8sWatchResource<NodeKind[]>(nodeResource);
  const [storageClass, setStorageClass] = React.useState(null);
  const [inProgress, setProgress] = React.useState(false);
  const [errorMessage, setError] = React.useState('');

  const deviceSets: DeviceSet[] = ocsConfig?.spec?.storageDeviceSets || [];
  const osdSizeWithUnit = getRequestedPVCSize(deviceSets?.[0]?.dataPVCTemplate);
  const osdSizeWithoutUnit: number = OSD_CAPACITY_SIZES[osdSizeWithUnit];
  const isNoProvionerSC: boolean = storageClass?.provisioner === NO_PROVISIONER;
  const selectedSCName: string = storageClass?.metadata?.name;
  const deviceSetIndex: number = getCurrentDeviceSetIndex(
    deviceSets,
    selectedSCName
  );
  const hasFlexibleScaling = checkFlexibleScaling(ocsConfig);
  const isArbiterEnabled: boolean = checkArbiterCluster(ocsConfig);
  const replica = isArbiterEnabled
    ? OCS_DEVICE_SET_ARBITER_REPLICA
    : OCS_DEVICE_SET_REPLICA;
  const name = ocsConfig?.metadata?.name;
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
      storageClasses.find((sc) => sc.metadata.name === installStorageClass),
    [installStorageClass]
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
    const osdSize = isNoProvionerSC
      ? defaultRequestSize.BAREMETAL
      : osdSizeWithUnit;
    let portable = !isNoProvionerSC;
    let deviceSetReplica = replica;
    let deviceSetCount = 1;

    if (hasFlexibleScaling) {
      portable = false;
      deviceSetReplica = 1;
    }
    if (isNoProvionerSC)
      deviceSetCount = getDeviceSetCount(availablePvsCount, deviceSetReplica);

    if (deviceSetIndex === -1) {
      patch.op = 'add';
      patch.path = `/spec/storageDeviceSets/-`;
      patch.value = createDeviceSet(
        selectedSCName,
        osdSize,
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
        model: OCSStorageClusterModel,
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
    >
      <ModalBody className="add-capacity-modal--overflow">
        <Trans t={t as any} ns="plugin__odf-console" values={{ name }}>
          Adding capacity for <strong>{{ name }}</strong>, may increase your
          expenses.
        </Trans>
        <FormGroup
          className="pf-u-pt-md pf-u-pb-sm"
          id="add-cap-sc-dropdown__FormGroup"
          fieldId="add-capacity-dropdown"
          label={t('StorageClass')}
          labelIcon={<FieldLevelHelp>{storageClassTooltip(t)}</FieldLevelHelp>}
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
              <TextContent className="pf-u-font-weight-bold pf-u-secondary-color-100 ceph-add-capacity__current-capacity">
                {t('Currently Used:')}&nbsp;
                {currentCapacity}
              </TextContent>
            </>
          ))}
        {errorMessage && (
          <Alert isInline variant="danger" title={t('An error occurred')}>
            {(errorMessage as any)?.message}
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
            data-test="modal-submit-action"
            key="Add"
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
    </Modal>
  );
};

export default AddSSCapacityModal;
