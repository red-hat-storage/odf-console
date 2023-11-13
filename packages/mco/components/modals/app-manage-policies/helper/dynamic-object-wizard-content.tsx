import * as React from 'react';
import {
  LABEL,
  LABEL_SPLIT_CHAR,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '@odf/mco/constants';
import { useACMSafeFetch } from '@odf/mco/hooks';
import { SearchResult } from '@odf/mco/types';
import { parseSyncInterval, getValueFromSearchResult } from '@odf/mco/utils';
import {
  LazyLabelExpressionSelector,
  OptionType,
} from '@odf/shared/label-expression-selector/labelExpressionSelector';
import { RadioSelection } from '@odf/shared/radio-selection';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { RequestSizeInput } from '@odf/shared/utils/RequestSizeInput';
import { Form, FormGroup } from '@patternfly/react-core';
import { queryAppResources } from '../utils/acm-search-quries';
import {
  DynamicObjectType,
  ManagePolicyStateAction,
  ManagePolicyStateType,
  ModalViewContext,
  ObjectProtectionMethod,
  PolicyRule,
} from '../utils/reducer';
import { RecipeSelector } from './recipe-selector';
import '../style.scss';

const SPLIT_CHAR = '=';

// Creating options from application resource labels
const createOptionsFromSearchResult = (
  searchResult: SearchResult
): OptionType => {
  const labels = getValueFromSearchResult(
    searchResult,
    LABEL,
    LABEL_SPLIT_CHAR
  );
  return (
    labels.reduce((acc, label) => {
      const [key, value] = label.split(SPLIT_CHAR);
      const valueProps = { text: value };
      const keyProps = { text: key };
      if (acc.hasOwnProperty(key)) {
        acc[key].values = [...acc[key].values, valueProps];
      } else {
        acc[key] = {
          key: keyProps,
          values: [valueProps],
        };
      }
      return acc;
    }, {} as OptionType) || {}
  );
};

const ReplicationInterval: React.FC<ReplicationIntervalProps> = ({
  captureInterval,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [selectedUnit, interval] = parseSyncInterval(captureInterval);
  const onChange = (event) => {
    const { value, unit } = event;
    dispatch({
      type: ManagePolicyStateType.SET_CAPTURE_INTERVAL,
      context: ModalViewContext.ASSIGN_POLICY_VIEW,
      payload: `${value}${unit}`,
    });
  };

  return (
    <Form>
      <FormGroup
        className="mco-manage-policies__radio--margin-top"
        label={t('Kubernetes object replication interval')}
        helperText={t(
          'Define the interval for Kubernetes object replication, this is only applicable for Kubernetes object and not application data.'
        )}
        isHelperTextBeforeField
      >
        <FormGroup
          className="mco-manage-policies__radio--margin-top"
          fieldId="sync-schedule"
          label={t('Interval')}
          isRequired
        >
          <RequestSizeInput
            name={t('Interval')}
            onChange={onChange}
            dropdownUnits={SYNC_SCHEDULE_DISPLAY_TEXT(t)}
            defaultRequestSizeUnit={selectedUnit}
            defaultRequestSizeValue={interval.toString()}
          />
        </FormGroup>
      </FormGroup>
    </Form>
  );
};

export const DynamicObjectWizardContent: React.FC<DynamicObjectWizardContentProps> =
  ({
    appName,
    workLoadNamespace,
    dynamicObjects,
    isValidationEnabled,
    clusterNames,
    policyRule,
    dispatch,
  }) => {
    const {
      objectProtectionMethod,
      appResourceSelector,
      captureInterval,
      recipeInfo,
    } = dynamicObjects;

    const { t } = useCustomTranslation();

    // ACM search proxy api call
    const searchQuery = React.useMemo(
      () =>
        queryAppResources(
          appName,
          workLoadNamespace,
          clusterNames,
          policyRule === PolicyRule.Namespace
        ),
      [appName, workLoadNamespace, clusterNames, policyRule]
    );
    const [searchResult] = useACMSafeFetch(searchQuery);

    // Generate options
    const options = React.useMemo(
      () => createOptionsFromSearchResult(searchResult),
      [searchResult]
    );

    const onChange = (method: string) => {
      dispatch({
        type: ManagePolicyStateType.SET_OBJECT_PROTECTION_METHOD,
        context: ModalViewContext.ASSIGN_POLICY_VIEW,
        payload: method as ObjectProtectionMethod,
      });
    };

    return (
      <>
        <RadioSelection
          className="mco-manage-policies__dynamicObject--padding"
          title={t('Protect Kubernetes objects')}
          description={t(
            'For your imperative applications, select a method to protect Kubernetes deployed dynamic objects'
          )}
          selected={objectProtectionMethod}
          radioProps={[
            {
              className: 'mco-manage-policies__radioBody--width',
              id: ObjectProtectionMethod.ResourceLabelSelector,
              name: ObjectProtectionMethod.ResourceLabelSelector,
              value: ObjectProtectionMethod.ResourceLabelSelector,
              label: t('Using resource label selector'),
              description: t(
                'Protect all Kubernetes resources that use the selected resource label selector'
              ),
              onChange,
              body: objectProtectionMethod ===
                ObjectProtectionMethod.ResourceLabelSelector && (
                <LazyLabelExpressionSelector
                  addString={t('Add another resource label selector')}
                  onChange={(expression) => {
                    dispatch({
                      type: ManagePolicyStateType.SET_APP_RESOURCE_SELECTOR,
                      context: ModalViewContext.ASSIGN_POLICY_VIEW,
                      payload: expression,
                    });
                  }}
                  preSelected={appResourceSelector}
                  options={options}
                  isValidationEnabled={isValidationEnabled}
                />
              ),
            },
            {
              className: 'mco-manage-policies__radioBody--width',
              id: ObjectProtectionMethod.Recipe,
              name: ObjectProtectionMethod.Recipe,
              value: ObjectProtectionMethod.Recipe,
              label: t('Using recipes'),
              description: t(
                'Protect Kubernetes resources as per rules or in the order defined within the recipe'
              ),
              onChange,
              body: objectProtectionMethod ===
                ObjectProtectionMethod.Recipe && (
                <RecipeSelector
                  clusterNames={clusterNames}
                  workLoadNamespace={workLoadNamespace}
                  recipeInfo={recipeInfo}
                  isValidationEnabled={isValidationEnabled}
                  dispatch={dispatch}
                />
              ),
            },
          ]}
        />
        <ReplicationInterval
          captureInterval={captureInterval}
          dispatch={dispatch}
        />
      </>
    );
  };

type DynamicObjectWizardContentProps = {
  appName: string;
  workLoadNamespace: string;
  clusterNames: string[];
  policyRule: PolicyRule;
  dynamicObjects: DynamicObjectType;
  isValidationEnabled: boolean;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
};

type ReplicationIntervalProps = {
  captureInterval: string;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
};
