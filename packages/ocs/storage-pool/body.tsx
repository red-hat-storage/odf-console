import * as React from 'react';
import { AttachStorageAction } from '@odf/core/components/attach-storage-storagesystem/state';
import { ErasureCodingTable } from '@odf/core/components/create-storage-system/create-storage-system-steps/advanced-settings-step/erasure-coding/erasure-coding-table';
import { ERASURE_CODING_MIN_NODES } from '@odf/core/constants';
import { checkArbiterCluster, checkFlexibleScaling } from '@odf/core/utils';
import { useOsdNodeCountForDeviceClass } from '@odf/ocs/hooks';
import {
  fieldRequirementsTranslations,
  formSettings,
} from '@odf/shared/constants';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { useK8sGet } from '@odf/shared/hooks';
import { TextInputWithFieldRequirements } from '@odf/shared/input-with-requirements';
import { StorageClusterModel } from '@odf/shared/models';
import { getNamespace } from '@odf/shared/selectors';
import {
  ListKind,
  StorageClusterKind,
  CephClusterKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import validationRegEx from '@odf/shared/utils/validation';
import { useYupValidationResolver } from '@odf/shared/yup-validation-resolver';
import * as _ from 'lodash-es';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import {
  Alert,
  AlertVariant,
  EmptyState,
  EmptyStateBody,
  Radio,
  FormGroup,
  TextInput,
  Icon,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { CaretDownIcon, InfoCircleIcon } from '@patternfly/react-icons';
import {
  OCS_DEVICE_REPLICA,
  PoolProgress,
  PoolState,
  PoolType,
} from '../constants';
import {
  getErrorMessage,
  ProgressStatusProps,
  PROGRESS_STATUS,
} from '../utils';
import {
  DataProtectionPolicy,
  StoragePoolAction,
  StoragePoolActionType,
  StoragePoolState,
} from './reducer';
import '../style.scss';
import './body.scss';

export const StoragePoolStatus: React.FC<StoragePoolStatusProps> = ({
  status,
  name,
  error = '',
}) => {
  const { t } = useCustomTranslation();
  const statusObj: ProgressStatusProps = PROGRESS_STATUS(t, name).find(
    (state) => state.name === status
  );

  return (
    <EmptyState icon={statusObj.icon}>
      <EmptyStateBody data-test="empty-state-body">
        {error ? getErrorMessage(error) : statusObj.desc}
      </EmptyStateBody>
    </EmptyState>
  );
};

export type StoragePoolStatusProps = {
  status: string;
  name?: string;
  error?: string;
};

export type StoragePoolBodyProps = {
  cephCluster: CephClusterKind;
  state: StoragePoolState;
  showPoolStatus: boolean;
  dispatch: React.Dispatch<StoragePoolAction | AttachStorageAction>;
  poolType: PoolType;
  existingNames?: string[];
  onPoolTypeChange?: (newPoolType: PoolType) => void;
  disablePoolType?: boolean;
  isUpdate?: boolean;
  prefixName?: string;
  usePrefix?: boolean;
  placeholder?: string;
  erasureCodingDeviceClass?: string;
  showErasureCodingOptions?: boolean;
};

export const StoragePoolBody: React.FC<StoragePoolBodyProps> = ({
  cephCluster,
  state,
  showPoolStatus,
  dispatch,
  poolType,
  existingNames,
  onPoolTypeChange,
  disablePoolType,
  isUpdate,
  prefixName,
  usePrefix,
  placeholder,
  erasureCodingDeviceClass,
  showErasureCodingOptions = true,
}) => {
  const { t } = useCustomTranslation();

  const poolNs = getNamespace(cephCluster);

  const [storageCluster, storageClusterLoaded, storageClusterLoadError] =
    useK8sGet<ListKind<StorageClusterKind>>(StorageClusterModel, null, poolNs);

  const [isReplicaOpen, setReplicaOpen] = React.useState(false);

  const poolNameMaxLength = 253;
  const { schema, fieldRequirements } = React.useMemo(() => {
    const translationFieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, poolNameMaxLength),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
      fieldRequirementsTranslations.cannotBeUsedBefore(t),
    ];

    const validationSchema = Yup.object({
      newPoolName: Yup.string()
        .required()
        .max(poolNameMaxLength, translationFieldRequirements[0])
        .matches(
          validationRegEx.startAndEndsWithAlphanumerics,
          translationFieldRequirements[1]
        )
        .matches(
          validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
          translationFieldRequirements[2]
        )
        .test(
          'unique-name',
          translationFieldRequirements[3],
          (value: string) =>
            !existingNames.includes(
              usePrefix ? `${prefixName}-${value}` : value
            )
        ),
    });

    return {
      schema: validationSchema,
      fieldRequirements: translationFieldRequirements,
    };
  }, [prefixName, usePrefix, existingNames, t]);

  const resolver = useYupValidationResolver(schema);
  const {
    formState: { errors },
    control,
    watch,
  } = useForm({
    ...formSettings,
    resolver,
  });

  const poolName: string = watch('newPoolName');

  React.useEffect(() => {
    // Update pool name: set empty on validation error.
    if (isUpdate) return;
    const possiblyPrefixedPoolName =
      usePrefix && poolName ? `${prefixName}-${poolName}` : poolName;
    const payload = errors?.newPoolName ? '' : possiblyPrefixedPoolName;
    dispatch({
      type: StoragePoolActionType.SET_POOL_NAME,
      payload: payload,
    });
  }, [
    poolName,
    dispatch,
    errors?.newPoolName,
    prefixName,
    usePrefix,
    isUpdate,
  ]);

  // Failure Domain
  React.useEffect(() => {
    if (storageClusterLoaded && !storageClusterLoadError)
      dispatch({
        type: StoragePoolActionType.SET_FAILURE_DOMAIN,
        payload: storageCluster?.items[0]?.status?.failureDomain || '',
      });
  }, [storageCluster, storageClusterLoaded, storageClusterLoadError, dispatch]);

  // Check storage cluster is in ready state
  const isClusterReady: boolean =
    cephCluster?.status?.phase === PoolState.READY;

  const currentStorageCluster = storageCluster?.items?.[0];
  const flexibleScaling = checkFlexibleScaling(currentStorageCluster);

  const {
    nodeCount: nodeCountForEC,
    loaded: osdPodWatchLoaded,
    loadError: osdPodWatchError,
  } = useOsdNodeCountForDeviceClass(poolNs, erasureCodingDeviceClass);

  const erasureCodingNodeInfoReady =
    flexibleScaling && osdPodWatchLoaded && !osdPodWatchError;

  const canShowErasureCoding =
    erasureCodingNodeInfoReady && nodeCountForEC >= ERASURE_CODING_MIN_NODES;

  const showOsdWatchLoading =
    flexibleScaling &&
    !!erasureCodingDeviceClass &&
    !osdPodWatchLoaded &&
    !osdPodWatchError;

  // Check storage cluster is arbiter
  React.useEffect(() => {
    const isArbiterCluster: boolean = checkArbiterCluster(
      storageCluster?.items[0]
    );
    dispatch({
      type: StoragePoolActionType.SET_POOL_ARBITER,
      payload: isArbiterCluster,
    });
    if (isArbiterCluster) {
      dispatch({
        type: StoragePoolActionType.SET_POOL_REPLICA_SIZE,
        payload: '4',
      });
    }
  }, [
    storageCluster,
    storageClusterLoaded,
    storageClusterLoadError,
    state.isArbiterCluster,
    dispatch,
  ]);

  const replicaList: string[] = _.keys(OCS_DEVICE_REPLICA).filter(
    (replica: string) =>
      (state.isArbiterCluster && replica === '4') ||
      (!state.isArbiterCluster && replica !== '4')
  );

  const onReplicaDropdownChange = React.useCallback(
    (
      _event?: React.MouseEvent<Element, MouseEvent>,
      value?: string | number
    ) => {
      if (value !== undefined && value !== '') {
        dispatch({
          type: StoragePoolActionType.SET_POOL_REPLICA_SIZE,
          payload: String(value),
        });
      }
      setReplicaOpen(false);
    },
    [dispatch]
  );

  const replicaDropdownItems = replicaList.map((replica) => {
    let warning = '';
    if (replica === '2') {
      warning = t(
        'Data loss may occur, only recommended for small clusters or when backups are available or data loss is acceptable'
      );
    }
    return (
      <DropdownItem
        key={`replica-${OCS_DEVICE_REPLICA[replica]}`}
        component="button"
        id={replica}
        value={replica}
        data-test-id="replica-dropdown-item"
        className="ceph-block-pool__dropdown-description"
        description={warning}
      >
        {t('{{replica}} Replication', {
          replica: OCS_DEVICE_REPLICA[replica],
        })}
      </DropdownItem>
    );
  });

  const replicaDropdownToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      id="replica-dropdown"
      data-test="replica-dropdown"
      onClick={() => setReplicaOpen(!isReplicaOpen)}
      isExpanded={isReplicaOpen}
      icon={<CaretDownIcon />}
      isDisabled={state.isArbiterCluster}
      isFullWidth
    >
      {state.replicaSize
        ? t('{{replica}} Replication', {
            replica: OCS_DEVICE_REPLICA[state.replicaSize],
          })
        : t('Select replication')}
    </MenuToggle>
  );

  return isClusterReady || !showPoolStatus ? (
    <>
      <FormGroup label={t('Volume type')} className="pf-v6-u-pt-xl" isRequired>
        <div className="pf-v6-u-display-flex pf-v6-u-flex-direction-row ceph-pool__radio-flex">
          <Radio
            label={t('Filesystem')}
            value="filesystem"
            id="type-filesystem"
            data-test="type-filesystem"
            name="volume-type"
            className="pf-v6-u-mr-4xl"
            isChecked={poolType === PoolType.FILESYSTEM}
            isDisabled={disablePoolType && poolType !== PoolType.FILESYSTEM}
            onChange={() => {
              onPoolTypeChange(PoolType.FILESYSTEM);
            }}
          />
          <Radio
            label={t('Block')}
            value="block"
            id="type-block"
            data-test="type-block"
            name="volume-type"
            isChecked={poolType === PoolType.BLOCK}
            isDisabled={disablePoolType && poolType !== PoolType.BLOCK}
            onChange={() => {
              onPoolTypeChange(PoolType.BLOCK);
            }}
          />
        </div>
      </FormGroup>
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements}
        defaultValue={state.poolName}
        popoverProps={{
          headerContent: t('Name requirements'),
          footerContent: `${t('Example')}: my-pool`,
        }}
        formGroupProps={{
          label: t('Pool name'),
          fieldId: 'pool-name',
          className: 'ceph-block-pool-body__input',
          isRequired: true,
        }}
        textInputProps={{
          id: 'pool-name',
          name: 'newPoolName',
          'data-test': 'new-pool-name-textbox',
          'aria-describedby': t('pool-name-help'),
          placeholder: placeholder || t('my-pool'),
          isDisabled: isUpdate,
        }}
        infoElement={
          (usePrefix || poolType === PoolType.FILESYSTEM) && (
            <>
              <Icon status="info">
                <InfoCircleIcon />
              </Icon>
              <span className="pf-v6-u-disabled-color-100 pf-v6-u-font-size-sm pf-v6-u-ml-sm">
                {t(
                  'The pool name comprises a prefix followed by the user-provided name.'
                )}
              </span>
            </>
          )
        }
        inputPrefixElement={
          (usePrefix || poolType === PoolType.FILESYSTEM) && (
            <>
              <TextInput
                id="pool-prefix"
                className="pool-prefix"
                value={prefixName}
                isDisabled={true}
              />
              <div className="pf-v6-u-ml-sm pf-v6-u-mr-sm">-</div>
            </>
          )
        }
      />
      <div className="form-group ceph-block-pool-body__input">
        <label
          className="control-label co-required"
          htmlFor="pool-replica-size"
        >
          {t('Data protection policy')}
        </label>
        {isUpdate || !showErasureCodingOptions ? (
          <Dropdown
            className="dropdown--full-width"
            isOpen={isReplicaOpen}
            onSelect={onReplicaDropdownChange}
            onOpenChange={(open: boolean) => setReplicaOpen(open)}
            toggle={replicaDropdownToggle}
            popperProps={{ width: 'trigger' }}
          >
            <DropdownList>{replicaDropdownItems}</DropdownList>
          </Dropdown>
        ) : (
          <div className="pf-v6-u-display-flex pf-v6-u-flex-direction-column pf-v6-u-gap-md">
            <div className="pf-v6-u-display-flex pf-v6-u-flex-direction-column pf-v6-u-gap-sm">
              <Radio
                label={t('Replication')}
                id="policy-replication"
                data-test="policy-replication"
                name="data-protection-policy"
                isChecked={
                  state.dataProtectionPolicy ===
                  DataProtectionPolicy.Replication
                }
                onChange={() =>
                  dispatch({
                    type: StoragePoolActionType.SET_DATA_PROTECTION_POLICY,
                    payload: DataProtectionPolicy.Replication,
                  })
                }
                className="pf-v6-u-mb-sm"
              />
              {state.dataProtectionPolicy ===
                DataProtectionPolicy.Replication && (
                <Dropdown
                  className="dropdown--full-width"
                  isOpen={isReplicaOpen}
                  onSelect={onReplicaDropdownChange}
                  onOpenChange={(open: boolean) => setReplicaOpen(open)}
                  toggle={replicaDropdownToggle}
                  popperProps={{ width: 'trigger' }}
                >
                  <DropdownList>{replicaDropdownItems}</DropdownList>
                </Dropdown>
              )}
              {osdPodWatchError && flexibleScaling && (
                <Alert
                  variant={AlertVariant.danger}
                  isInline
                  className="pf-v6-u-mt-md"
                  title={String(
                    _.get(osdPodWatchError, 'message', osdPodWatchError) ?? ''
                  )}
                />
              )}
              {showOsdWatchLoading && (
                <div className="pf-v6-u-mt-md">
                  <LoadingInline />
                </div>
              )}
              {canShowErasureCoding && (
                <div className="pf-v6-u-mt-md">
                  <Radio
                    label={t('Erasure coding')}
                    id="policy-erasure-coding"
                    data-test="policy-erasure-coding"
                    name="data-protection-policy"
                    isChecked={
                      state.dataProtectionPolicy ===
                      DataProtectionPolicy.ErasureCoding
                    }
                    onChange={() =>
                      dispatch({
                        type: StoragePoolActionType.SET_DATA_PROTECTION_POLICY,
                        payload: DataProtectionPolicy.ErasureCoding,
                      })
                    }
                  />
                </div>
              )}
            </div>
            {state.dataProtectionPolicy ===
              DataProtectionPolicy.ErasureCoding &&
              canShowErasureCoding && (
                <div className="pf-v6-u-mt-md">
                  <ErasureCodingTable
                    nodeCount={nodeCountForEC}
                    selectedScheme={state.erasureCodingScheme}
                    onSelectScheme={(scheme) =>
                      dispatch({
                        type: StoragePoolActionType.SET_ERASURE_CODING_SCHEME,
                        payload: scheme,
                      })
                    }
                    showOnlySchemeAndOverhead
                  />
                </div>
              )}
          </div>
        )}
      </div>
      <div className="form-group ceph-block-pool-body__input">
        <label className="control-label" htmlFor="compression-check">
          {t('Data compression')}
        </label>
        <div className="checkbox ceph-block-pool-body__compression">
          <input
            type="checkbox"
            onChange={(event) =>
              dispatch({
                type: StoragePoolActionType.SET_POOL_COMPRESSED,
                payload: event.target.checked,
              })
            }
            checked={state.isCompressed}
            id="compression-check"
            name="compression-check"
            data-test="compression-checkbox"
          />
          {t(
            'Optimize storage efficiency by enabling data compression within replicas.'
          )}
        </div>
      </div>
      {state.isCompressed && (
        <Alert
          className="co-alert ceph-block-pool__alert"
          variant="info"
          title={t(
            'Enabling compression may result in little or no space savings for encrypted or random data. Also, enabling compression may have an impact on I/O performance.'
          )}
          isInline
        />
      )}
    </>
  ) : (
    <StoragePoolStatus status={PoolProgress.CLUSTERNOTREADY} />
  );
};
