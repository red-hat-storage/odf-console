import * as React from 'react';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { getName, getUID } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import {
  Select,
  SelectOption,
  SelectVariant,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { isPeerReady } from '../../../utils';
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
  drPolicyControlState.drPolicyControl?.spec?.drPolicyRef?.name ===
  drPolicyName;

const validateTargetCluster = (
  drPolicyControlState: DRPolicyControlState,
  targetClusterName: string
) =>
  drPolicyControlState.drPolicyControl?.spec?.preferredCluster !==
  targetClusterName;

const getValidOptions = (
  option: React.ReactElement,
  validOptions: React.ReactElement[],
  isValidTargetCluster: boolean,
  isValidPeerStatus: boolean
) =>
  isValidTargetCluster
    ? isValidPeerStatus
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
    key={getUID(drPolicyControlState?.drPolicyControl)}
    value={getName(drPolicyControlState?.drPolicyControl)}
    isChecked={isValid}
    isDisabled={!isValid}
    data-test={`option-${getName(drPolicyControlState?.drPolicyControl)}`}
  >
    {drPolicyControlState?.subscriptions.map((subName) => (
      <p key={subName}> {subName} </p>
    ))}
    <HelperText>
      <HelperTextItem variant={isValid ? 'default' : 'indeterminate'}>
        {t('Placed: {{cluster}}', {
          cluster:
            drPolicyControlState?.drPolicyControl?.spec?.preferredCluster,
        })}
      </HelperTextItem>
      <HelperTextItem variant="indeterminate">
        <i>
          {isPeerReady(drPolicyControlState?.drPolicyControl)
            ? t('Peer ready')
            : t('Peer not ready')}
        </i>
      </HelperTextItem>
    </HelperText>
  </SelectOption>
);

export const SubscriptionGroupSelector: React.FC<SubscriptionGroupSelectorProps> =
  ({ state, dispatch }) => {
    const { t } = useCustomTranslation();
    const selectedTargetCluster = state.selectedTargetCluster;
    const selectedDRPolicy = state.selectedDRPolicy;
    const [isOpen, setOpen] = React.useState(false);
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
      (errorMessage: string) => {
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
                selectedTargetCluster?.clusterName
              );
              const isValidPeerStatus = isPeerReady(drpcState?.drPolicyControl);
              isValidTargetCluster &&
                isValidPeerStatus &&
                validState.push(getName(drpcState.drPolicyControl));
              const option = getOptions(drpcState, isValidTargetCluster, t);
              return {
                validOptions: getValidOptions(
                  option,
                  acc.validOptions,
                  isValidTargetCluster,
                  isValidPeerStatus
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
          setErrorMessage('');
        } else {
          setOptions([]);
          setSelected([]);
          setErrorMessage(t('No subscription groups are found'));
        }
      } else {
        setSelected([]);
        setOptions([]);
      }
    }, [
      memoizedDRPCState,
      selectedDRPolicy,
      selectedTargetCluster,
      dispatch,
      setSelected,
      setErrorMessage,
      setOptions,
      t,
    ]);

    const onToggle = (isOpen) => {
      setOpen(isOpen);
    };

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
        <Select
          variant={SelectVariant.checkbox}
          onToggle={onToggle}
          onSelect={onSelect}
          selections={state.selectedSubsGroups}
          isDisabled={
            !options?.length ||
            state.modalFooterStatus === ModalFooterStatus.FINISHED
          }
          isOpen={isOpen}
          isCheckboxSelectionBadgeHidden
          placeholderText={
            options?.length > 0
              ? t('{{selected}} of {{total}} selected', {
                  selected: state.selectedSubsGroups.length,
                  total: options?.length,
                })
              : t('Select')
          }
          aria-labelledby={t('subscription-selector')}
          onClear={clearSelection}
          maxHeight="12rem"
          className="mco-dr-action-body__dropdown-width"
          data-test="subs-group-selector-options"
        >
          {options}
        </Select>
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
