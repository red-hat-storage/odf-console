import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Dropdown,
  DropdownToggle,
  DropdownItem,
} from '@patternfly/react-core/deprecated';
import {
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import {
  DRActionType,
  MANAGED_CLUSTER_CONDITION_AVAILABLE,
  ReplicationType,
} from '../../../../constants';
import {
  getDRClusterResourceObj,
  getManagedClusterResourceObj,
} from '../../../../hooks';
import { ACMManagedClusterKind, DRClusterKind } from '../../../../types';
import { DateTimeFormat } from '../failover-relocate-modal-body';
import { ErrorMessageType } from './error-messages';
import {
  FailoverAndRelocateState,
  FailoverAndRelocateAction,
  FailoverAndRelocateType,
  TargetClusterType,
  ModalFooterStatus,
} from './reducer';

export enum DRClusterStatus {
  FENCED = 'Fenced',
  UNFENCED = 'Unfenced',
  AVAILABLE = 'Available',
}

const getAvailableCondition = (managedCluster: ACMManagedClusterKind) =>
  managedCluster?.status?.conditions?.find(
    (condition) =>
      condition?.type === MANAGED_CLUSTER_CONDITION_AVAILABLE &&
      condition.status === 'True'
  );

const TargetClusterStatus: React.FC<TargetClusterStatusProps> = ({
  isClusterAvailable,
}) => {
  return isClusterAvailable ? (
    <GreenCheckCircleIcon />
  ) : (
    <RedExclamationCircleIcon />
  );
};

const resources = {
  drClusters: getDRClusterResourceObj(),
  managedClusters: getManagedClusterResourceObj(),
};

export const TargetClusterSelector: React.FC<TargetClusterSelectorProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const response =
    useK8sWatchResources<TargetClusterWatchResourceType>(resources);

  const { selectedDRPolicy } = state;

  const {
    data: drClusters,
    loaded: drClustersLoaded,
    loadError: drClustersLoadError,
  } = response?.drClusters;

  const {
    data: managedClusters,
    loaded: managedClustersLoaded,
    loadError: managedClustersLoadError,
  } = response?.managedClusters;

  const [isOpen, setOpen] = React.useState(false);

  const drClusterList = React.useMemo(
    () =>
      drClustersLoaded && !drClustersLoadError
        ? drClusters?.filter((drCluster) =>
            selectedDRPolicy?.drClusters?.includes(getName(drCluster))
          )
        : [],
    [drClusters, drClustersLoaded, drClustersLoadError, selectedDRPolicy]
  );

  const managedClusterList = React.useMemo(
    () =>
      managedClustersLoaded && !managedClustersLoadError
        ? managedClusters?.filter((managedCluster) =>
            selectedDRPolicy?.drClusters?.includes(getName(managedCluster))
          )
        : [],
    [
      managedClusters,
      managedClustersLoaded,
      managedClustersLoadError,
      selectedDRPolicy,
    ]
  );

  React.useLayoutEffect(() => {
    if (
      state.actionType === DRActionType.RELOCATE &&
      !!managedClusterList.length
    ) {
      const areBothClustersUp = managedClusterList.every(
        (managedCluster) => !!getAvailableCondition(managedCluster)
      );
      !areBothClustersUp &&
        dispatch({
          type: FailoverAndRelocateType.SET_ERROR_MESSAGE,
          payload: {
            managedClustersErrorMessage:
              ErrorMessageType.MANAGED_CLUSTERS_ARE_DOWN,
          },
        });
    }
  }, [managedClusterList, state.actionType, dispatch, t]);

  const setErrorMessage = (errorMessage: ErrorMessageType) => {
    dispatch({
      type: FailoverAndRelocateType.SET_ERROR_MESSAGE,
      payload: {
        targetClusterErrorMessage: errorMessage,
      },
    });
  };

  const setSelected = (selection: TargetClusterType) => {
    dispatch({
      type: FailoverAndRelocateType.SET_SELECTED_TARGET_CLUSTER,
      payload: selection,
    });
  };

  const onToggle = (isOpenFlag: boolean) => {
    setOpen(isOpenFlag);
  };

  const dropdownItems = React.useMemo(
    () =>
      managedClusterList.map((managedCluster, index) => (
        <DropdownItem
          id={index.toString()}
          data-test={`target-cluster-dropdown-item-${index}`}
          key={`selected-target-cluster-${getName(managedCluster)}`}
          value={getName(managedCluster)}
          component="button"
        >
          {getName(managedCluster)}
        </DropdownItem>
      )),
    [managedClusterList]
  );

  const onSelect = (e) => {
    // Select a target cluster to intiate failover or relocate
    const managedCluster = managedClusterList?.[e.currentTarget.id];

    // Check ACM managed cluster is available or not
    const condition = getAvailableCondition(managedCluster);
    let isClusterAvailable = !!condition;
    let isClusterFenced = true;
    let errorMessage = 0;

    if (isClusterAvailable) {
      // Check DR fencing status for origin cluster
      const targetCluster = drClusterList.find(
        (drCluster) => getName(drCluster) === getName(managedCluster)
      );
      const originCluster = drClusterList.find(
        (drCluster) => getName(drCluster) !== getName(managedCluster)
      );

      if (selectedDRPolicy.replicationType === ReplicationType.SYNC) {
        if (state.actionType === DRActionType.RELOCATE) {
          // Ensure origin and target both clusters are unfenced
          const isClustersUnfenced = drClusterList.every(
            (drCluster) =>
              DRClusterStatus.FENCED !==
              (drCluster?.status?.phase as DRClusterStatus)
          );
          errorMessage =
            !isClustersUnfenced && ErrorMessageType.SOME_CLUSTERS_ARE_FENCED;
        } else {
          // Ensure origin cluster is fenced
          const isClustersFenced =
            DRClusterStatus.FENCED ===
            (originCluster?.status?.phase as DRClusterStatus);
          const fencedErrorMessage =
            !isClustersFenced && ErrorMessageType.PRIMARY_CLUSTER_IS_NOT_FENCED;
          // Ensure target cluster is unfenced
          const isClusterUnFenced =
            DRClusterStatus.FENCED !==
            (targetCluster?.status?.phase as DRClusterStatus);
          const unFencedErrorMessage =
            !isClusterUnFenced && ErrorMessageType.TARGET_CLUSTER_IS_FENCED;
          errorMessage = fencedErrorMessage || unFencedErrorMessage;
        }
      }
    } else {
      errorMessage = ErrorMessageType.TARGET_CLUSTER_IS_NOT_AVAILABLE;
    }
    setSelected({
      clusterInfo: {
        clusterName: getName(managedCluster),
        clusterNamespace: getNamespace(managedCluster),
      },
      isClusterAvailable: isClusterAvailable && isClusterFenced,
      lastAvailableTime: condition?.lastTransitionTime,
    });
    setErrorMessage(errorMessage);
    setOpen(false);
  };

  return (
    <>
      <Dropdown
        className="mco-subs-dr-action-body__dropdown--width"
        onSelect={onSelect}
        toggle={
          <DropdownToggle
            className="mco-subs-dr-action-body__dropdown--width"
            data-test="target-cluster-dropdown-toggle"
            isDisabled={
              !drClusterList.length ||
              !managedClusterList.length ||
              state.modalFooterStatus === ModalFooterStatus.FINISHED ||
              !!state.errorMessage.managedClustersErrorMessage
            }
            onToggle={(_event, isOpenFlag: boolean) => onToggle(isOpenFlag)}
          >
            {!!Object.keys(state.selectedTargetCluster).length ? (
              <Flex>
                <FlexItem className="mco-subs-dr-action__target-cluster--width">
                  {state.selectedTargetCluster?.clusterInfo?.clusterName}
                </FlexItem>
                <FlexItem>
                  <TargetClusterStatus
                    isClusterAvailable={
                      state.selectedTargetCluster?.isClusterAvailable
                    }
                  />
                </FlexItem>
              </Flex>
            ) : (
              t('Select')
            )}
          </DropdownToggle>
        }
        isOpen={isOpen}
        dropdownItems={dropdownItems}
      />
      <HelperText>
        <HelperTextItem variant="indeterminate">
          {t('Last available: ')}
          <DateTimeFormat
            dateTime={state.selectedTargetCluster?.lastAvailableTime}
            className="pf-v5-u-display-inline-block pf-v5-u-ml-sm"
          />
        </HelperTextItem>
      </HelperText>
    </>
  );
};

type TargetClusterSelectorProps = {
  state: FailoverAndRelocateState;
  dispatch: React.Dispatch<FailoverAndRelocateAction>;
};

type TargetClusterWatchResourceType = {
  drClusters: DRClusterKind[];
  managedClusters: ACMManagedClusterKind[];
};

type TargetClusterStatusProps = {
  isClusterAvailable: boolean;
};
