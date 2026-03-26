import * as React from 'react';
import { AttachStorageAction } from '@odf/core/components/attach-storage-storagesystem/state';
import { ErasureCodingSchemaTable } from '@odf/core/components/create-storage-system/create-storage-system-steps/advanced-settings-step/erasure-coding/erasure-coding-schema-table';
import { ERASURE_CODING_MIN_NODES } from '@odf/core/constants';
import { odfPodsResource } from '@odf/core/resources';
import {
  checkArbiterCluster,
  checkFlexibleScaling,
  getNodeCountWithOSDsForDeviceClass,
} from '@odf/core/utils';
import {
  fieldRequirementsTranslations,
  formSettings,
} from '@odf/shared/constants';
import { useK8sGet } from '@odf/shared/hooks';
import { TextInputWithFieldRequirements } from '@odf/shared/input-with-requirements';
import { StorageClusterModel } from '@odf/shared/models';
import { getNamespace } from '@odf/shared/selectors';
import {
  ListKind,
  StorageClusterKind,
  CephClusterKind,
  PodKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import validationRegEx from '@odf/shared/utils/validation';
import { useYupValidationResolver } from '@odf/shared/yup-validation-resolver';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import {
  Alert,
  AlertVariant,
  Checkbox,
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
  Spinner,
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
  StoragePoolAction,
  StoragePoolActionType,
  StoragePoolState,
} from './reducer';
import '../style.scss';
import './body.scss';

const ProgressSpinnerIcon: React.FC<{ className?: string }> = () => (
  <Spinner size="lg" />
);

export const StoragePoolStatus: React.FC<StoragePoolStatusProps> = ({
  status,
  name,
  error = '',
}) => {
  const { t } = useCustomTranslation();
  const allStatuses = PROGRESS_STATUS(t, name);
  const statusObj: ProgressStatusProps =
    allStatuses.find((state) => state.name === status) ?? allStatuses[0];

  const emptyStateIcon = React.useMemo(
    () =>
      status === PoolProgress.PROGRESS ? ProgressSpinnerIcon : statusObj.icon,
    [status, statusObj]
  );

  return (
    <EmptyState variant="sm" icon={emptyStateIcon}>
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
  /** When provided (e.g. attach storage flow), use this for EC schema validation instead of OSD pod-based count. */
  nodeCountForErasureCoding?: number;
  /** Default CephBlockPool deviceClass (from default block pool); used to count OSD nodes for EC when not using nodeCountForErasureCoding. */
  erasureCodingDeviceClass?: string;
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
  nodeCountForErasureCoding: nodeCountForErasureCodingProp,
  erasureCodingDeviceClass,
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

  const [pods] = useK8sWatchResource<PodKind[]>(odfPodsResource(poolNs ?? ''));
  // Use nodes with OSD pods for the default block pool's device class for erasure coding schema validation.
  const nodeCountForEC =
    nodeCountForErasureCodingProp !== undefined
      ? nodeCountForErasureCodingProp
      : currentStorageCluster
        ? getNodeCountWithOSDsForDeviceClass(
            currentStorageCluster,
            pods ?? [],
            erasureCodingDeviceClass ?? ''
          )
        : 0;
  // Show erasure coding only when flexibleScaling is enabled and there are enough nodes.
  const canShowErasureCoding =
    flexibleScaling && nodeCountForEC >= ERASURE_CODING_MIN_NODES;

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
        value={replica}
        data-test-id="replica-dropdown-item"
        className="ceph-block-pool__dropdown-description"
        description={warning}
        onClick={() => {
          dispatch({
            type: StoragePoolActionType.SET_POOL_REPLICA_SIZE,
            payload: replica,
          });
        }}
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
      <FormGroup
        label={t('Volume type')}
        className="pf-v6-u-pt-xl"
        isRequired
        role="radiogroup"
        fieldId="volume-type-group"
      >
        <div className="pf-v6-u-display-flex pf-v6-u-flex-direction-row ceph-pool__radio-flex">
          <Radio
            label={t('Filesystem')}
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
              <span className="ceph-block-pool-body__disabled-text pf-v6-u-font-size-sm pf-v6-u-ml-sm">
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
      <FormGroup
        label={t('Data protection policy')}
        fieldId="data-protection-policy"
        isRequired
        role="radiogroup"
        className="ceph-block-pool-body__input"
      >
        <div className="pf-v6-u-display-flex pf-v6-u-flex-direction-column pf-v6-u-gap-md">
          <div className="pf-v6-u-display-flex pf-v6-u-flex-direction-column pf-v6-u-gap-sm">
            <Radio
              label={t('Replication')}
              id="policy-replication"
              data-test="policy-replication"
              name="data-protection-policy"
              isChecked={state.dataProtectionPolicy === 'replication'}
              onChange={() =>
                dispatch({
                  type: StoragePoolActionType.SET_DATA_PROTECTION_POLICY,
                  payload: 'replication',
                })
              }
            />
            {state.dataProtectionPolicy === 'replication' && (
              <div className="pf-v6-u-ml-lg ceph-block-pool__replica-dropdown-wrap">
                <Dropdown
                  className="ceph-block-pool__replica-dropdown"
                  isOpen={isReplicaOpen}
                  onSelect={() => setReplicaOpen(false)}
                  onOpenChange={(open: boolean) => setReplicaOpen(open)}
                  toggle={replicaDropdownToggle}
                  popperProps={{ width: 'trigger' }}
                >
                  <DropdownList>{replicaDropdownItems}</DropdownList>
                </Dropdown>
              </div>
            )}
            {canShowErasureCoding && (
              <div className="pf-v6-u-mt-md">
                <Radio
                  label={t('Erasure coding')}
                  id="policy-erasure-coding"
                  data-test="policy-erasure-coding"
                  name="data-protection-policy"
                  isChecked={state.dataProtectionPolicy === 'erasure-coding'}
                  onChange={() =>
                    dispatch({
                      type: StoragePoolActionType.SET_DATA_PROTECTION_POLICY,
                      payload: 'erasure-coding',
                    })
                  }
                />
              </div>
            )}
          </div>
          {state.dataProtectionPolicy === 'erasure-coding' &&
            canShowErasureCoding && (
              <div className="pf-v6-u-mt-md">
                <ErasureCodingSchemaTable
                  nodeCount={nodeCountForEC}
                  selectedSchema={state.erasureCodingSchema}
                  onSelectSchema={(selectedSchema) =>
                    dispatch({
                      type: StoragePoolActionType.SET_ERASURE_CODING_SCHEMA,
                      payload: selectedSchema,
                    })
                  }
                  showOnlySchemeAndOverhead
                />
              </div>
            )}
        </div>
      </FormGroup>
      <FormGroup
        label={t('Data compression')}
        fieldId="compression-check"
        className="ceph-block-pool-body__input"
      >
        <Checkbox
          id="compression-check"
          name="compression-check"
          data-test="compression-checkbox"
          label={t(
            'Optimize storage efficiency by enabling data compression within replicas.'
          )}
          isChecked={state.isCompressed}
          onChange={(_event, checked) =>
            dispatch({
              type: StoragePoolActionType.SET_POOL_COMPRESSED,
              payload: checked,
            })
          }
        />
      </FormGroup>
      {state.isCompressed && (
        <Alert
          className="ceph-block-pool__alert"
          variant={AlertVariant.info}
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
