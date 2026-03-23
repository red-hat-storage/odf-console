import * as React from 'react';
import { MultiSelectDropdown } from '@odf/shared';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { getName, getUID } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'react-i18next';
import { SelectOption } from '@patternfly/react-core';
import { HelperText, HelperTextItem } from '@patternfly/react-core';
import { checkDRActionReadiness } from '../../../../utils';
import { ErrorMessageType } from './error-messages';
import { PlacementDecision } from './reducer';
import {
  FailoverAndRelocateState,
  FailoverAndRelocateAction,
  DRPolicyControlState,
  FailoverAndRelocateType,
  ModalFooterStatus,
} from './reducer';

const validateDRPolicy = (
  drPolicyControlState: DRPolicyControlState,
  drPolicyName: string
) =>
  drPolicyControlState.drPlacementControl?.spec?.drPolicyRef?.name ===
  drPolicyName;

const validateTargetCluster = (
  drPolicyControlState: DRPolicyControlState,
  targetCluster: PlacementDecision
) => {
  const currentDeploymentCluster = drPolicyControlState?.clusterName;
  return (
    currentDeploymentCluster !== targetCluster?.clusterName &&
    currentDeploymentCluster !== targetCluster?.clusterNamespace
  );
};

const getValidOptions = (
  option: React.ReactElement,
  validOptions: React.ReactElement[],
  isValidTargetCluster: boolean,
  isDRReady: boolean
) =>
  isValidTargetCluster
    ? isDRReady
      ? [option, ...validOptions]
      : [...validOptions, option]
    : validOptions;

const getInValidOptions = (
  option: React.ReactElement,
  inValidOptions: React.ReactElement[],
  isValidTargetCluster: boolean
) => (isValidTargetCluster ? inValidOptions : [option, ...inValidOptions]);

const getOptions = (
  drPolicyControlState: DRPolicyControlState,
  isValid: boolean,
  t: TFunction
) => (
  <SelectOption
    key={getUID(drPolicyControlState?.drPlacementControl)}
    value={getName(drPolicyControlState?.drPlacementControl)}
    isDisabled={!isValid}
    data-test={`option-${getName(drPolicyControlState?.drPlacementControl)}`}
  >
    {drPolicyControlState?.subscriptions.map((subName) => (
      <p key={subName}> {subName} </p>
    ))}
    <HelperText>
      <HelperTextItem variant={isValid ? 'default' : 'indeterminate'}>
        {t('Placed: {{cluster}}', {
          cluster: drPolicyControlState?.clusterName,
        })}
      </HelperTextItem>
    </HelperText>
  </SelectOption>
);

export const SubscriptionGroupSelector: React.FC<
  SubscriptionGroupSelectorProps
> = ({ state, dispatch }) => {
  const { t } = useCustomTranslation();
  const { selectedTargetCluster, selectedDRPolicy, actionType } = state;
  const [options, setOptions] = React.useState<React.ReactElement[]>([]);
  const memoizedDRPCState = useDeepCompareMemoize(
    state.drPolicyControlState,
    true
  );

  const setSelected = React.useCallback(
    (selection: string[], isUpdate?: boolean) => {
      dispatch({
        type: FailoverAndRelocateType.SET_SELECTED_SUBS_GROUP,
        payload: {
          selected: selection,
          isUpdate,
        },
      });
    },
    [dispatch]
  );

  const setErrorMessage = React.useCallback(
    (errorMessage: ErrorMessageType) => {
      dispatch({
        type: FailoverAndRelocateType.SET_ERROR_MESSAGE,
        payload: {
          subscriptionGroupErrorMessage: errorMessage,
        },
      });
    },
    [dispatch]
  );

  React.useEffect(() => {
    // Filter all DRPlacements under a selected target cluster
    if (
      !!Object.keys(selectedTargetCluster).length &&
      selectedTargetCluster?.isClusterAvailable
    ) {
      const validState: string[] = [];
      const generatedOptions = memoizedDRPCState.reduce(
        (acc, drpcState) => {
          if (validateDRPolicy(drpcState, selectedDRPolicy?.policyName)) {
            const isValidTargetCluster = validateTargetCluster(
              drpcState,
              selectedTargetCluster?.clusterInfo
            );
            const isDRActionReady = checkDRActionReadiness(
              drpcState?.drPlacementControl,
              actionType
            );
            isValidTargetCluster &&
              isDRActionReady &&
              validState.push(getName(drpcState.drPlacementControl));
            const option = getOptions(drpcState, isValidTargetCluster, t);
            return {
              validOptions: getValidOptions(
                option,
                acc.validOptions,
                isValidTargetCluster,
                isDRActionReady
              ),
              inValidOptions: getInValidOptions(
                option,
                acc.inValidOptions,
                isValidTargetCluster
              ),
            };
          } else {
            return acc;
          }
        },
        {
          validOptions: [],
          inValidOptions: [],
        }
      );
      if (
        !!generatedOptions.validOptions.length ||
        !!generatedOptions.inValidOptions.length
      ) {
        setSelected(validState);
        setOptions([
          ...generatedOptions.validOptions,
          ...generatedOptions.inValidOptions,
        ]);
        setErrorMessage(0 as ErrorMessageType);
      } else {
        setOptions([]);
        setSelected([]);
        setErrorMessage(ErrorMessageType.NO_SUBSCRIPTION_GROUP_FOUND);
      }
    } else {
      setSelected([]);
      setOptions([]);
    }
  }, [
    actionType,
    memoizedDRPCState,
    selectedDRPolicy,
    selectedTargetCluster,
    dispatch,
    setSelected,
    setErrorMessage,
    setOptions,
    t,
  ]);

  const onSelect = (_, selection) =>
    state.selectedSubsGroups.includes(selection)
      ? setSelected(
          state.selectedSubsGroups.filter((item) => item !== selection)
        )
      : setSelected([selection], true);

  const clearSelection = () => {
    setSelected([]);
  };

  return (
    <>
      <MultiSelectDropdown
        variant={'checkbox'}
        placeholderText={
          options?.length > 0
            ? t('{{selected}} of {{total}} selected', {
                selected: state.selectedSubsGroups.length,
                total: options?.length,
              })
            : t('Select')
        }
        isDisabled={
          !options?.length ||
          state.modalFooterStatus === ModalFooterStatus.FINISHED
        }
        onChange={onSelect}
        selections={state.selectedSubsGroups}
        aria-label={t('subscription-selector')}
        data-test="subs-group-selector-options"
        selectOptions={options}
        onClear={clearSelection}
      />
      <HelperText>
        <HelperTextItem variant="indeterminate">
          {t('Select the subscriptions groups you wish to replicate via')}
        </HelperTextItem>
      </HelperText>
    </>
  );
};

type SubscriptionGroupSelectorProps = {
  state: FailoverAndRelocateState;
  dispatch: React.Dispatch<FailoverAndRelocateAction>;
};
