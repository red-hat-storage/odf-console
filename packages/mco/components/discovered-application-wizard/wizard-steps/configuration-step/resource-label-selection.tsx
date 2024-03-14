import * as React from 'react';
import { useACMSafeFetch } from '@odf/mco/hooks';
import { SearchResultItemType } from '@odf/mco/types';
import {
  getLabelsFromSearchResult,
  queryK8sResourceFromCluster,
} from '@odf/mco/utils';
import { StatusBox } from '@odf/shared/generic/status-box';
import { LazyLabelExpressionSelector } from '@odf/shared/label-expression-selector';
import { PersistentVolumeClaimModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidatedProp } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  MatchExpression,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import {
  EnrollDiscoveredApplicationAction,
  EnrollDiscoveredApplicationStateType,
} from '../../utils/reducer';
import './configuration-step.scss';

const getLabelOptions = (
  searchResultItem: SearchResultItemType[]
): LabelOptionsType =>
  searchResultItem?.reduce(
    (acc, item) => {
      const labels = getLabelsFromSearchResult(item);
      // Separate PVC labels from other K8s resource labels
      const isPVCKind = item.kind === PersistentVolumeClaimModel.kind;
      Object.entries(labels)?.forEach(([key, values]) => {
        if (isPVCKind) {
          const valuesSet = new Set([
            ...(acc['pvcLabels']?.[key] || []),
            ...values,
          ]);
          acc['pvcLabels'][key] = Array.from(valuesSet);
        } else {
          const valuesSet = new Set([
            ...(acc['k8sResourceLabel']?.[key] || []),
            ...values,
          ]);
          acc['k8sResourceLabel'][key] = Array.from(valuesSet);
        }
      });
      return acc;
    },
    { pvcLabels: {}, k8sResourceLabel: {} }
  );

export const ResourceLabelSelection: React.FC<ResourceLabelSelectionProps> = ({
  k8sResourceLabelExpressions,
  pvcLabelExpressions,
  clusterName,
  namespaces,
  isValidationEnabled,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const searchQuery = React.useMemo(
    () => queryK8sResourceFromCluster(clusterName, namespaces.map(getName)),
    [clusterName, namespaces]
  );

  // ACM search proxy API call
  const [searchResult, searchError, searchLoaded] =
    useACMSafeFetch(searchQuery);

  const labelOptions = React.useMemo(() => {
    if (searchLoaded && !searchError) {
      return getLabelOptions(searchResult?.data.searchResult?.[0]?.items || []);
    }
    return { pvcLabels: {}, k8sResourceLabel: {} };
  }, [searchResult, searchLoaded, searchError]);

  const k8sResourceLabelValidated = getValidatedProp(
    isValidationEnabled && !k8sResourceLabelExpressions
  );

  const pvcLabelValidated = getValidatedProp(
    isValidationEnabled && !pvcLabelExpressions
  );

  const setK8sResourceLabelExpressions = (expressions: MatchExpression[]) =>
    dispatch({
      type: EnrollDiscoveredApplicationStateType.SET_K8S_RESOURCE_LABEL_EXPRESSIONS,
      payload: expressions,
    });

  const setPVCLabelExpressions = (expressions: MatchExpression[]) =>
    dispatch({
      type: EnrollDiscoveredApplicationStateType.SET_PVC_LABEL_EXPRESSIONS,
      payload: expressions,
    });

  return (
    <>
      {searchLoaded && !searchError ? (
        <>
          <FormGroup
            label={t('Label expressions')}
            fieldId="protection-method-selection"
            isRequired
          >
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={k8sResourceLabelValidated}>
                  {k8sResourceLabelValidated === 'error'
                    ? t('Required')
                    : t(
                        'Protect all your Kubernetes objects matching the selected resource label value.'
                      )}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
            <LazyLabelExpressionSelector
              selectedExpressions={k8sResourceLabelExpressions}
              labels={labelOptions.k8sResourceLabel}
              isValidationEnabled={isValidationEnabled}
              onChange={setK8sResourceLabelExpressions}
            />
          </FormGroup>
          <FormGroup
            label={t('PVC label selectors')}
            fieldId="protection-method-selection"
            isRequired
          >
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={pvcLabelValidated}>
                  {pvcLabelValidated === 'error'
                    ? t('Required')
                    : t(
                        'Protect all your volumes that match the selected PVC labels'
                      )}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
            <LazyLabelExpressionSelector
              selectedExpressions={pvcLabelExpressions}
              labels={labelOptions.pvcLabels}
              isValidationEnabled={isValidationEnabled}
              onChange={setPVCLabelExpressions}
              addExpressionString={t('Add PVC label selector')}
            />
          </FormGroup>
        </>
      ) : (
        <StatusBox loaded={searchLoaded} loadError={searchError} />
      )}
    </>
  );
};

type LabelOptionsType = {
  pvcLabels: { [key in string]: string[] };
  k8sResourceLabel: { [key in string]: string[] };
};

type ResourceLabelSelectionProps = {
  // Selected k8s resource label selector expressions
  k8sResourceLabelExpressions: MatchExpression[];
  // Selected PVC label selector expressions
  pvcLabelExpressions: MatchExpression[];
  // Selected discovered application deployment cluster
  clusterName: string;
  // Selected discovered application namespaces
  namespaces: K8sResourceCommon[];
  // Form validation enabled/disabled
  isValidationEnabled: boolean;
  // Update state
  dispatch: React.Dispatch<EnrollDiscoveredApplicationAction>;
};
