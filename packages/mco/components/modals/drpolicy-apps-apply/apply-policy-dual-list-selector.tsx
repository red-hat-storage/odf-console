import * as React from 'react';
import { CustomDualListSelector } from '@odf/shared/generic/custom-dual-list-selector';
import { SelectorInput } from '@odf/shared/modals/Selector';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import classNames from 'classnames';
import { Trans } from 'react-i18next';
import {
  DualListSelectorPane,
  DualListSelectorList,
  DualListSelectorListItem,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  Title,
  Label,
  FormGroup,
  Form,
} from '@patternfly/react-core';
import {
  ExclamationTriangleIcon,
  LockIcon,
  CheckCircleIcon,
} from '@patternfly/react-icons';
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
  chosenOptions: PlacementToAppSets[];
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

type DualListSelectorExpandListItemProps = {
  id: string;
  appName: string;
  appNamespace: string;
  isAlreadyProtected: boolean;
  children: React.ReactNode;
};

const defaultLabelsState = {
  drpcName: undefined,
  existingLabels: [],
  updateLabels: [],
};

type EmptyPaneProp = {
  title: string;
  children?: React.ReactNode;
  icon: React.ComponentClass;
};

type PaneMessageProps = {
  totalChosenOptions: number;
  leftPane?: boolean;
};

const PaneMessage: React.FC<PaneMessageProps> = ({
  leftPane,
  totalChosenOptions,
}) => {
  const { t } = useCustomTranslation();
  const title = leftPane
    ? !totalChosenOptions
      ? t('There are no applications under Available list.')
      : t('There are no more applications under Available list to protect.')
    : t('No protected applications');
  const icon = leftPane
    ? !totalChosenOptions
      ? ExclamationTriangleIcon
      : CheckCircleIcon
    : LockIcon;
  const message = leftPane ? (
    <Trans t={t}>
      You can create applications from the{' '}
      <strong> Create application set </strong> page.
    </Trans>
  ) : (
    t(
      'There are no applications under the Protected list. Move applications from the available list to assign DR policy.'
    )
  );

  return (
    <EmptyPane title={title} icon={icon}>
      {message}
    </EmptyPane>
  );
};

const EmptyPane: React.FC<EmptyPaneProp> = ({ title, children, icon }) => {
  return (
    <EmptyState>
      <EmptyStateIcon icon={icon} />
      <Title headingLevel="h4">{title}</Title>
      <EmptyStateBody data-test="empty-state-body">{children}</EmptyStateBody>
    </EmptyState>
  );
};

const DualListSelectorAvailablePane: React.FC<DualListSelectorAvailablePaneProps> =
  ({ availableOptions, chosenOptions, buildSearchInput, onOptionSelect }) => {
    const { t } = useCustomTranslation();

    const totalAvailableOptions: number = availableOptions.filter(
      (option) => option.isVisible
    ).length;
    const totalChosenOptions: number = chosenOptions.filter(
      (option) => option.isVisible
    ).length;

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
          {!totalAvailableOptions ? (
            <PaneMessage
              leftPane={true}
              totalChosenOptions={totalChosenOptions}
            />
          ) : (
            availableOptions.map((option, optionIndex) =>
              option.isVisible ? (
                <DualListSelectorListItem
                  key={optionIndex}
                  isSelected={option.selected}
                  id={`available-option-${optionIndex}`}
                  onOptionSelect={(e) => onOptionSelect(e, optionIndex, false)}
                  translate={false}
                >
                  <div className="mco-apply-policy-dual-selector__listRow">
                    <div className="mco-apply-policy-dual-selector__listItem">
                      <span className="mco-apply-policy-dual-selector__listItem--text">
                        {option.appSetName}
                      </span>
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
            )
          )}
        </DualListSelectorList>
      </DualListSelectorPane>
    );
  };

const DualListSelectorExpandListItem: React.FunctionComponent<DualListSelectorExpandListItemProps> =
  ({
    children,
    id,
    appName,
    appNamespace,
    isAlreadyProtected,
    ...props
  }: DualListSelectorExpandListItemProps) => {
    const { t } = useCustomTranslation();
    const [isExpanded, setIsExpanded] = React.useState(false);

    return (
      <li
        className={classNames(
          'pf-c-expandable-section',
          isExpanded && 'pf-m-expanded',
          'pf-m-indented',
          { ...(isExpanded && { 'aria-expanded': 'true' }) }
        )}
        {...props}
      >
        <div className="pf-c-expandable-section__toggle mco-apply-policy-dual-selector__listItem">
          <button
            type="button"
            className="mco-apply-policy-dual-selector__button"
            aria-expanded={isExpanded}
            onClick={(e) => {
              setIsExpanded(!isExpanded);
              e.stopPropagation();
            }}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === ' ' || e.key === 'Enter') {
                setIsExpanded(!isExpanded);
                e.preventDefault();
              }
            }}
          >
            <span className="pf-c-expandable-section__toggle-icon">
              <AngleRightIcon aria-hidden />
            </span>
          </button>
          <span className="pf-c-expandable-section__toggle-text mco-apply-policy-dual-selector__listItem--text">
            {appName}
          </span>
          <span>
            {isAlreadyProtected && (
              <Label isCompact color="green">
                {t('Protected')}
              </Label>
            )}
          </span>
        </div>
        <div className="mco-apply-policy-dual-selector__ItemDescription--color mco-apply-policy-dual-selector__ExpandItem--indent">
          {appNamespace}
        </div>
        <div
          className="pf-c-expandable-section__content"
          hidden={!isExpanded}
          id={id}
        >
          {children}
        </div>
      </li>
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
    const labels: string[] =
      drpcPvcLabels?.[option.namespace]?.[option.placement]?.updateLabels || [];

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
        <DualListSelectorExpandListItem
          id={`chosen-expand-option-${optionIndex}`}
          appName={option.appSetName}
          appNamespace={option.namespace}
          isAlreadyProtected={option.isAlreadyProtected}
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
        </DualListSelectorExpandListItem>
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
          <PaneMessage totalChosenOptions={totalChosenOptions} />
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
