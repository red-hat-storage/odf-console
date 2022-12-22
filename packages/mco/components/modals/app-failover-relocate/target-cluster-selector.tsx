import * as React from 'react';
import { utcDateTimeFormatterWithTimeZone } from '@odf/shared/details-page/datetime';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import {
  Dropdown,
  DropdownToggle,
  DropdownItem,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { UnknownIcon } from '@patternfly/react-icons';
import { REPLICATION_TYPE } from '../../../constants';
import { ACMManagedClusterModel, DRClusterModel } from '../../../models';
import { ACMManagedClusterKind, DRClusterKind } from '../../../types';
import {
  FailoverAndRelocateState,
  FailoverAndRelocateAction,
  FailoverAndRelocateType,
  ACTION_TYPE,
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
      condition?.type === 'ManagedClusterConditionAvailable' &&
      condition.status === 'True'
  );

export const getReplicationTypeUsingDRClusters = (
  targetClusters: DRClusterKind[]
) =>
  targetClusters?.every(
    (drClusterInfo) =>
      drClusterInfo?.spec?.region === targetClusters?.[0]?.spec?.region
  )
    ? REPLICATION_TYPE.SYNC
    : REPLICATION_TYPE.ASYNC;

const getLastUpdatedTime = (lastAvailableTime: string, t: TFunction) => {
  return lastAvailableTime ? (
    <span>
      {utcDateTimeFormatterWithTimeZone.format(new Date(lastAvailableTime))}
    </span>
  ) : (
    <span>
      <UnknownIcon /> {t('Unknown')}
    </span>
  );
};

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
  drClusters: {
    kind: referenceForModel(DRClusterModel),
    namespaced: false,
    isList: true,
  },
  managedClusters: {
    kind: referenceForModel(ACMManagedClusterModel),
    namespaced: false,
    isList: true,
  },
};

export const TargetClusterSelector: React.FC<TargetClusterSelectorProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const response =
    useK8sWatchResources<TargetClusterWatchResourceType>(resources);

  const memoizedDRClusters = useDeepCompareMemoize(response.drClusters, true);
  const memoizedManagedClusters = useDeepCompareMemoize(
    response.managedClusters,
    true
  );
  const selectdDRPolicy = state.selectedDRPolicy;

  const {
    data: drClusters,
    loaded: drClustersLoaded,
    loadError: drClustersLoadError,
  } = memoizedDRClusters;

  const {
    data: managedClusters,
    loaded: managedClustersLoaded,
    loadError: managedClustersLoadError,
  } = memoizedManagedClusters;

  const [isOpen, setOpen] = React.useState(false);

  const drClusterList = React.useMemo(
    () =>
      drClustersLoaded && !drClustersLoadError
        ? drClusters?.filter((drCluster) =>
            selectdDRPolicy?.drClusters?.includes(getName(drCluster))
          )
        : [],
    [drClusters, drClustersLoaded, drClustersLoadError, selectdDRPolicy]
  );

  const managedClusterList = React.useMemo(
    () =>
      managedClustersLoaded && !managedClustersLoadError
        ? managedClusters?.filter((managedCluster) =>
            selectdDRPolicy?.drClusters?.includes(getName(managedCluster))
          )
        : [],
    [
      managedClusters,
      managedClustersLoaded,
      managedClustersLoadError,
      selectdDRPolicy,
    ]
  );

  React.useLayoutEffect(() => {
    if (
      state.actionType === ACTION_TYPE.RELOCATE &&
      !!managedClusterList.length
    ) {
      const areBothClustersUp = managedClusterList.every(
        (managedCluster) => !!getAvailableCondition(managedCluster)
      );
      !areBothClustersUp &&
        dispatch({
          type: FailoverAndRelocateType.SET_ERROR_MESSAGE,
          payload: {
            managedClustersErrorMessage: t(
              'Attempting to relocate is not possible, one or more managed clusters are down.'
            ),
          },
        });
    }
  }, [managedClusterList, state.actionType, dispatch, t]);

  const setErrorMessage = (errorMessage: string) => {
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

  const onToggle = (isOpen: boolean) => {
    setOpen(isOpen);
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
    let errorMessage = '';

    if (isClusterAvailable) {
      // Check DR fencing status for origin cluster
      const targetCluster = drClusterList.find(
        (drCluster) => getName(drCluster) === getName(managedCluster)
      );
      const originCluster = drClusterList.find(
        (drCluster) => getName(drCluster) !== getName(managedCluster)
      );
      const replicationType = getReplicationTypeUsingDRClusters(drClusterList);
      if (replicationType === REPLICATION_TYPE.SYNC) {
        if (state.actionType === ACTION_TYPE.RELOCATE) {
          // Ensure origin and target both clusters are unfenced
          const isClustersUnfenced = drClusterList.every((drCluster) =>
            [DRClusterStatus.UNFENCED, DRClusterStatus.AVAILABLE].includes(
              drCluster?.status?.phase as DRClusterStatus
            )
          );
          errorMessage =
            !isClustersUnfenced && t('Not all clusters are unfenced.');
        } else {
          // Ensure origin cluster is fenced
          const isClustersFenced = [DRClusterStatus.FENCED].includes(
            originCluster?.status?.phase as DRClusterStatus
          );
          const fencedErrorMessage =
            !isClustersFenced &&
            t('Source cluster {{cluster}} is not fenced.', {
              cluster: getName(originCluster),
            });
          // Ensure target cluster is unfenced
          const isClusterUnFenced = [
            DRClusterStatus.UNFENCED,
            DRClusterStatus.AVAILABLE,
          ].includes(targetCluster?.status?.phase as DRClusterStatus);
          const unFencedErrorMessage =
            !isClusterUnFenced &&
            t('Target cluster {{cluster}} is not unfenced.', {
              cluster: getName(targetCluster),
            });
          errorMessage = fencedErrorMessage || unFencedErrorMessage;
        }
      }
    } else {
      errorMessage = t('Target cluster {{cluster}} is not available.', {
        cluster: getName(managedCluster),
      });
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
        className="mco-dr-action-body__dropdown--width"
        onSelect={onSelect}
        toggle={
          <DropdownToggle
            className="mco-dr-action-body__dropdown--width"
            data-test="target-cluster-dropdown-toggle"
            isDisabled={
              !drClusterList.length ||
              !managedClusterList.length ||
              state.modalFooterStatus === ModalFooterStatus.FINISHED ||
              !!state.errorMessage.managedClustersErrorMessage
            }
            onToggle={onToggle}
          >
            {!!Object.keys(state.selectedTargetCluster).length ? (
              <Flex>
                <FlexItem className="mco-dr-action__target-cluster--width">
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
          {getLastUpdatedTime(
            state.selectedTargetCluster?.lastAvailableTime,
            t
          )}
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
