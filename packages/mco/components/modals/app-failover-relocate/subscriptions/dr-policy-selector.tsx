import * as React from 'react';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { getName, getUID } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { Dropdown, DropdownToggle, DropdownItem } from '@patternfly/react-core';
import { DRPolicyModel } from '../../../../models';
import { DRPolicyKind } from '../../../../types';
import {
  DRPolicyControlState,
  FailoverAndRelocateState,
  FailoverAndRelocateAction,
  FailoverAndRelocateType,
  DRPolicyType,
  ModalFooterStatus,
} from './reducer';

const getDRPolicyNames = (drpcState: DRPolicyControlState[]): string[] => [
  ...new Set(
    drpcState.map(
      (currentDrpcState) =>
        currentDrpcState?.drPolicyControl?.spec?.drPolicyRef?.name
    )
  ),
];

const getDRPolicyList = (
  drpolicyNames: string[],
  drPolicies: DRPolicyKind[]
): DRPolicyKind[] =>
  drPolicies.filter((drPolicy) => drpolicyNames.includes(getName(drPolicy)));

export const DRPolicySelector: React.FC<DRPolicySelectorProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [drPolicies, drPoliciesLoaded, drPoliciesLoadError] =
    useK8sWatchResource<DRPolicyKind[]>({
      kind: referenceForModel(DRPolicyModel),
      isList: true,
    });
  const memoizedDRPolicies = useDeepCompareMemoize(drPolicies, true);
  const memoizedDRPCState = useDeepCompareMemoize(
    state.drPolicyControlState,
    true
  );
  const [isOpen, setOpen] = React.useState(false);

  const setSelected = (selection: DRPolicyType) => {
    dispatch({
      type: FailoverAndRelocateType.SET_SELECTED_DR_POLICY,
      payload: selection,
    });
  };

  const drPolicyList = React.useMemo(
    () =>
      drPoliciesLoaded &&
      !drPoliciesLoadError &&
      !!memoizedDRPCState.length &&
      !!memoizedDRPolicies.length
        ? getDRPolicyList(
            getDRPolicyNames(memoizedDRPCState),
            memoizedDRPolicies
          )
        : [],
    [
      memoizedDRPCState,
      memoizedDRPolicies,
      drPoliciesLoaded,
      drPoliciesLoadError,
    ]
  );

  const dropdownItems = React.useMemo(
    () =>
      drPolicyList.map((drPolicy, index) => (
        <DropdownItem
          id={index.toString()}
          data-test={`dr-policy-dropdown-item-${index}`}
          key={getUID(drPolicy)}
          value={getName(drPolicy)}
          component="button"
        >
          {getName(drPolicy)}
        </DropdownItem>
      )),
    [drPolicyList]
  );

  const onToggle = (isOpenFlag: boolean) => setOpen(isOpenFlag);

  const onSelect = (e: React.SyntheticEvent<HTMLDivElement>) => {
    // Selecting a DRPolicy to intiate failover or relocate
    const drPolicy: DRPolicyKind = drPolicyList[e.currentTarget.id];
    setSelected({
      policyName: getName(drPolicy),
      drClusters: drPolicy?.spec?.drClusters,
    });
    setOpen(false);
  };

  return (
    <>
      <Dropdown
        className="mco-subs-dr-action-body__dropdown--width"
        onSelect={onSelect}
        toggle={
          <DropdownToggle
            id="drPolicy-selection"
            data-test="dr-subs-policy-dropdown-toggle"
            className="mco-subs-dr-action-body__dropdown--width"
            isDisabled={
              !drPolicyList.length ||
              state.modalFooterStatus === ModalFooterStatus.FINISHED
            }
            onToggle={onToggle}
          >
            {state.selectedDRPolicy.policyName || t('Select')}
          </DropdownToggle>
        }
        isOpen={isOpen}
        dropdownItems={dropdownItems}
      />
    </>
  );
};

type DRPolicySelectorProps = {
  state: FailoverAndRelocateState;
  dispatch: React.Dispatch<FailoverAndRelocateAction>;
};
