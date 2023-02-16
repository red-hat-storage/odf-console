import * as React from 'react';
import { CustomDualListSelector } from '@odf/shared/generic/custom-dual-list-selector';
import { SelectorInput } from '@odf/shared/modals/Selector';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  DualListSelectorPane,
  DualListSelectorList,
  DualListSelectorListItem,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  Title,
  Label,
  ExpandableSection,
  FormGroup,
  Form,
} from '@patternfly/react-core';
import { LockIcon } from '@patternfly/react-icons';
import { PlacementToAppSets, PlacementToDrpcMap } from '../../../types';
import {
  ApplyPolicyInitialState,
  ApplyPolicyAction,
  ApplyPolicyType,
} from './reducer';
import './apply-policy-dual-list-selector.scss';

type ApplyPolicyDualListSelectorProps = {
  state: ApplyPolicyInitialState;
  dispatch: React.Dispatch<ApplyPolicyAction>;
};

type DualListSelectorAvailablePaneProps = {
  availableOptions: PlacementToAppSets[];
  buildSearchInput: (isAvailable: boolean) => JSX.Element;
  onOptionSelect: (
    _event: React.MouseEvent | React.ChangeEvent | React.KeyboardEvent,
    index: number,
    isChosen: boolean
  ) => void;
};

type DualListSelectorChosenPaneProps = Omit<
  DualListSelectorAvailablePaneProps,
  'availableOptions'
> & {
  chosenOptions: PlacementToAppSets[];
  state: ApplyPolicyInitialState;
  dispatch: React.Dispatch<ApplyPolicyAction>;
};

type DualListSelectorChosenListItemProps = {
  option: PlacementToAppSets;
  optionIndex: number;
  drpcPvcLabels: PlacementToDrpcMap;
  setDrpcPvcLabels: (options: PlacementToDrpcMap) => void;
} & Pick<DualListSelectorAvailablePaneProps, 'onOptionSelect'>;

const defaultLabelsState = {
  drpcName: undefined,
  existingLabels: [],
  updateLabels: [],
};

const EmptyChosenState: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <EmptyState>
      <EmptyStateIcon icon={LockIcon} />
      <Title headingLevel="h4">{t('No protected applications')}</Title>
      <EmptyStateBody data-test="empty-state-body">
        {t(
          'There are currently no applications under DR protection. Move applications from the available list to apply DR policy.'
        )}
      </EmptyStateBody>
    </EmptyState>
  );
};

const DualListSelectorAvailablePane: React.FC<DualListSelectorAvailablePaneProps> =
  ({ availableOptions, buildSearchInput, onOptionSelect }) => {
    const { t } = useCustomTranslation();

    return (
      <DualListSelectorPane
        title={t('Available')}
        status={t('{{ selected }} of {{ total }} applications selected', {
          selected: availableOptions.filter(
            (option) => option.selected && option.isVisible
          ).length,
          total: availableOptions.filter((option) => option.isVisible).length,
        })}
        searchInput={buildSearchInput(true)}
      >
        <DualListSelectorList>
          {availableOptions.map((option, optionIndex) =>
            option.isVisible ? (
              <DualListSelectorListItem
                key={optionIndex}
                isSelected={option.selected}
                id={`available-option-${optionIndex}`}
                onOptionSelect={(e) => onOptionSelect(e, optionIndex, false)}
                translate={false}
              >
                <div className="mco-apply-policy-dual-selector__listItem">
                  <div>
                    {option.appSetName}
                    {option.isAlreadyProtected && (
                      <span>
                        <Label isCompact color="green">
                          {t('Protected')}
                        </Label>
                      </span>
                    )}
                  </div>
                  <div className="mco-apply-policy-dual-selector__ItemDescription--color">
                    {option.namespace}
                  </div>
                </div>
              </DualListSelectorListItem>
            ) : null
          )}
        </DualListSelectorList>
      </DualListSelectorPane>
    );
  };

const DualListSelectorChosenListItem: React.FC<DualListSelectorChosenListItemProps> =
  ({
    option,
    optionIndex,
    onOptionSelect,
    drpcPvcLabels,
    setDrpcPvcLabels,
  }) => {
    const { t } = useCustomTranslation();
    const [isExpanded, setIsExpanded] = React.useState(false);

    const labels: string[] =
      drpcPvcLabels?.[option.namespace]?.[option.placement]?.updateLabels || [];

    const onToggle = (isExpanded: boolean) => {
      setIsExpanded(isExpanded);
    };

    const setLabels = (l: string[]) => {
      const options: PlacementToDrpcMap = { ...drpcPvcLabels };

      !options.hasOwnProperty(option.namespace) &&
        (options[option.namespace] = {
          [option.placement]: { ...defaultLabelsState },
        });
      !options[option.namespace].hasOwnProperty(option.placement) &&
        (options[option.namespace][option.placement] = {
          ...defaultLabelsState,
        });

      options[option.namespace][option.placement].updateLabels = [...l];
      setDrpcPvcLabels({ ...options });
    };

    return (
      <DualListSelectorListItem
        key={optionIndex}
        isSelected={option.selected}
        id={`chosen-option-${optionIndex}`}
        onOptionSelect={(e) => onOptionSelect(e, optionIndex, true)}
        translate={false}
      >
        <ExpandableSection
          toggleContent={
            <div className="mco-apply-policy-dual-selector__listItem">
              <div>
                {option.appSetName}
                {option.isAlreadyProtected && (
                  <span>
                    <Label isCompact color="green">
                      {t('Protected')}
                    </Label>
                  </span>
                )}
              </div>
              <div className="mco-apply-policy-dual-selector__ItemDescription--color">
                {option.namespace}
              </div>
            </div>
          }
          onToggle={onToggle}
          isExpanded={isExpanded}
          isIndented
        >
          <Form>
            <FormGroup
              className="modalBody modalInput--lowHeight"
              fieldId="pvc-selector"
              label={t('Add label')}
              isRequired
              onChange={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <SelectorInput
                onChange={(l) => setLabels(l)}
                tags={labels}
                disabled={option.isAlreadyProtected}
              />
            </FormGroup>
          </Form>
        </ExpandableSection>
      </DualListSelectorListItem>
    );
  };

const DualListSelectorChosenPane: React.FC<DualListSelectorChosenPaneProps> = ({
  chosenOptions,
  buildSearchInput,
  onOptionSelect,
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const drpcPvcLabels: PlacementToDrpcMap = state.drpcPvcLabels[state.appType];
  const setDrpcPvcLabels = (options: PlacementToDrpcMap) =>
    dispatch({
      type: ApplyPolicyType.SET_DRPC_PVC_LABELS,
      payload: options,
    });

  const totalChosenOptions: number = chosenOptions.filter(
    (option) => option.isVisible
  ).length;

  return (
    <DualListSelectorPane
      title={t('Protected')}
      status={t('{{ selected }} of {{ total }} applications selected', {
        selected: chosenOptions.filter(
          (option) => option.selected && option.isVisible
        ).length,
        total: totalChosenOptions,
      })}
      searchInput={buildSearchInput(false)}
      isChosen
    >
      <DualListSelectorList>
        {!totalChosenOptions ? (
          <EmptyChosenState />
        ) : (
          chosenOptions.map((option, optionIndex) =>
            option.isVisible ? (
              <DualListSelectorChosenListItem
                option={option}
                optionIndex={optionIndex}
                onOptionSelect={onOptionSelect}
                drpcPvcLabels={drpcPvcLabels}
                setDrpcPvcLabels={setDrpcPvcLabels}
              />
            ) : null
          )
        )}
      </DualListSelectorList>
    </DualListSelectorPane>
  );
};

export const ApplyPolicyDualListSelector: React.FC<ApplyPolicyDualListSelectorProps> =
  ({ state, dispatch }) => {
    const availableOptions: PlacementToAppSets[] =
      state.availableResources[state.appType];
    const chosenOptions: PlacementToAppSets[] =
      state.protectedResources[state.appType];
    const setAvailableOptions = (options: PlacementToAppSets[]) =>
      dispatch({
        type: ApplyPolicyType.SET_AVAILABLE_RESOURCES,
        payload: options,
      });
    const setChosenOptions = (options: PlacementToAppSets[]) =>
      dispatch({
        type: ApplyPolicyType.SET_PROTECTED_RESOURCES,
        payload: options,
      });

    return (
      <CustomDualListSelector
        availableOptions={availableOptions}
        setAvailableOptions={setAvailableOptions}
        chosenOptions={chosenOptions}
        setChosenOptions={setChosenOptions}
        DualListSelectorAvailablePane={DualListSelectorAvailablePane}
        DualListSelectorChosenPane={DualListSelectorChosenPane}
        searchFilterCondition={(option: PlacementToAppSets, value: string) =>
          option.appSetName.toLowerCase().includes(value.toLowerCase())
        }
        state={state}
        dispatch={dispatch}
      />
    );
  };
