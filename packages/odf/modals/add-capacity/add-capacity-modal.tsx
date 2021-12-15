import * as React from 'react';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import {
  ModalTitle,
  ModalBody,
  ModalSubmitFooter,
} from '@odf/shared/generic/ModalTitle';
import { NodeModel, PersistentVolumeModel } from '@odf/shared/models';
import { PVsAvailableCapacity } from '@odf/shared/storage/pvc/pvs-available-capacity';
import {
  StorageClassResourceKind,
  NodeKind,
  StorageClusterKind,
  DeviceSet,
} from '@odf/shared/types';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  WatchK8sResource,
  k8sPatch,
} from '@openshift-console/dynamic-plugin-sdk';
import { usePrometheusPoll } from '@openshift-console/dynamic-plugin-sdk-internal';
import {
  useK8sGet,
  StorageClassDropdown,
  createModalLauncher,
} from '@openshift-console/dynamic-plugin-sdk-internal-kubevirt';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import { PrometheusEndpoint } from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-types';
import classNames from 'classnames';
import { TFunction } from 'i18next';
import { Trans, useTranslation } from 'react-i18next';
import { FormGroup, TextInput, TextContent } from '@patternfly/react-core';
import {
  defaultRequestSize,
  NO_PROVISIONER,
  OCS_DEVICE_SET_ARBITER_REPLICA,
  OCS_DEVICE_SET_REPLICA,
  OSD_CAPACITY_SIZES,
  requestedCapacityTooltip,
  storageClassTooltip,
} from '../../constants';
import { OCSStorageClusterModel } from '../../models';
import { CAPACITY_INFO_QUERIES, StorageDashboardQuery } from '../../queries';
import { StorageSystemKind } from '../../types';
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
import './add-capacity-modal.scss';

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
        label={t('ceph-storage-plugin~Raw Capacity')}
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
          data-test-id="requestSize"
        />
        <TextContent className="ceph-add-capacity__provisioned-capacity">
          {' '}
          {t('ceph-storage-plugin~x {{ replica, number }} replicas =', {
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

type AddSSCapacityModalProps = {
  storageSystem: StorageSystemKind;
  close?: () => void;
  cancel?: () => void;
};

const AddSSCapacityModal: React.FC<AddSSCapacityModalProps> = ({
  storageSystem,
  close,
  cancel,
}) => {
  const [ocs, ocsLoaded, ocsError] = useK8sGet<StorageClusterKind>(
    OCSStorageClusterModel,
    storageSystem.spec.name,
    storageSystem.spec.namespace
  );
  if (!ocsLoaded || ocsError) {
    return null;
  }

  return <AddCapacityModal ocsConfig={ocs} close={close} cancel={cancel} />;
};

const AddCapacityModal = (props: AddCapacityModalProps) => {
  const { t } = useTranslation();

  const { ocsConfig, close, cancel } = props;

  const [cephTotal, totalError, totalLoaded] = usePrometheusPoll({
    endpoint: 'api/v1/query' as PrometheusEndpoint,
    query: CAPACITY_INFO_QUERIES[StorageDashboardQuery.RAW_CAPACITY_TOTAL],
  });
  const [cephUsed, usedError, usedLoaded] = usePrometheusPoll({
    endpoint: 'api/v1/query' as PrometheusEndpoint,
    query: CAPACITY_INFO_QUERIES[StorageDashboardQuery.RAW_CAPACITY_TOTAL],
  });
  const [values, loading, loadError] = [
    [
      cephTotal?.data?.result?.[0]?.value?.[1],
      cephUsed?.data?.result?.[0]?.value?.[1],
    ],
    !totalLoaded || !usedLoaded,
    !(totalError || usedError),
  ];
  const [pvData, pvLoaded, pvLoadError] =
    useK8sWatchResource<K8sResourceCommon[]>(pvResource);
  const [nodesData, nodesLoaded, nodesLoadError] =
    useK8sWatchResource<NodeKind[]>(nodeResource);
  const [storageClass, setStorageClass] = React.useState(null);
  const [inProgress, setProgress] = React.useState(false);
  const [errorMessage, setError] = React.useState('');

  const deviceSets: DeviceSet[] = ocsConfig?.spec.storageDeviceSets || [];
  const osdSizeWithUnit = getRequestedPVCSize(deviceSets?.[0]?.dataPVCTemplate);
  const osdSizeWithoutUnit: number = OSD_CAPACITY_SIZES[osdSizeWithUnit];
  const isNoProvionerSC: boolean = storageClass?.provisioner === NO_PROVISIONER;
  const selectedSCName: string = storageClass.metadata.name;
  const deviceSetIndex: number = getCurrentDeviceSetIndex(
    deviceSets,
    selectedSCName
  );
  const hasFlexibleScaling = checkFlexibleScaling(ocsConfig);
  const isArbiterEnabled: boolean = checkArbiterCluster(ocsConfig);
  const replica = isArbiterEnabled
    ? OCS_DEVICE_SET_ARBITER_REPLICA
    : OCS_DEVICE_SET_REPLICA;
  const name = ocsConfig.metadata.name;
  const totalCapacityMetric = values?.[0];
  const usedCapacityMetric = values?.[1];
  const usedCapacity = humanizeBinaryBytes(usedCapacityMetric);
  const totalCapacity = humanizeBinaryBytes(totalCapacityMetric);
  /** Name of the installation storageClass which will be the pre-selected value for the dropdown */
  const installStorageClass =
    deviceSets?.[0]?.dataPVCTemplate?.spec?.storageClassName;
  const nodesError: boolean =
    nodesLoadError || !(nodesData as []).length || !nodesLoaded;

  const validateSC = React.useCallback(() => {
    if (!selectedSCName)
      return t('ceph-storage-plugin~No StorageClass selected');
    if (!isNoProvionerSC || hasFlexibleScaling) return '';
    if (isArbiterEnabled && !isArbiterSC(selectedSCName, pvData, nodesData)) {
      return t(
        'ceph-storage-plugin~The Arbiter stretch cluster requires a minimum of 4 nodes (2 different zones, 2 nodes per zone). Please choose a different StorageClass or create a new LocalVolumeSet that matches the minimum node requirement.'
      );
    }
    if (
      !isArbiterEnabled &&
      !isValidTopology(selectedSCName, pvData, nodesData)
    ) {
      return t(
        'ceph-storage-plugin~The StorageCluster requires a minimum of 3 nodes. Please choose a different StorageClass or create a new LocalVolumeSet that matches the minimum node requirement.'
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
    currentCapacity = (
      <div className="text-muted">{t('ceph-storage-plugin~Not available')}</div>
    );
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
          close();
        })
        .catch((err) => {
          setError(err);
          setProgress(false);
        });
    }
  };

  return (
    /** https://bugzilla.redhat.com/show_bug.cgi?id=1968690
     * The quickest and safest fix for now is to not use <Form> and use a straight <form> instead.
     */
    <form onSubmit={submit} name="form">
      {/** Modal is spanning across entire screen (for small screen sizes)
       * Wrapped components inside a <div> to fix it.
       */}
      <div className="modal-content modal-content--no-inner-scroll">
        <ModalTitle>{t('ceph-storage-plugin~Add Capacity')}</ModalTitle>
        <ModalBody>
          <Trans t={t as any} ns="ceph-storage-plugin" values={{ name }}>
            Adding capacity for <strong>{{ name }}</strong>, may increase your
            expenses.
          </Trans>
          <FormGroup
            className="pf-u-pt-md pf-u-pb-sm"
            id="add-cap-sc-dropdown__FormGroup"
            fieldId="add-capacity-dropdown"
            label={t('ceph-storage-plugin~StorageClass')}
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
                noSelection
                selectedKey={selectedSCName || installStorageClass}
                filter={filterSC}
                hideClassName="ceph-add-capacity__sc-dropdown--hide"
                data-test="add-cap-sc-dropdown"
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
                  {t('ceph-storage-plugin~Currently Used:')}&nbsp;
                  {currentCapacity}
                </TextContent>
              </>
            ))}
        </ModalBody>
        <ModalSubmitFooter
          inProgress={inProgress}
          errorMessage={errorMessage}
          submitText={t('ceph-storage-plugin~Add')}
          cancel={cancel}
          submitDisabled={isNoProvionerSC && (!availablePvsCount || nodesError)}
        />
      </div>
    </form>
  );
};

type AddCapacityModalProps = {
  kind?: any;
  ocsConfig?: any;
  cancel?: () => void;
  close?: () => void;
};

export const addSSCapacityModal = createModalLauncher(AddSSCapacityModal);
