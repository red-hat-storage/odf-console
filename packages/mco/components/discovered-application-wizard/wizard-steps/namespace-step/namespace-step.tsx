import * as React from 'react';
import { DRPolicyModel } from '@odf/mco/models';
import { DRPolicyKind } from '@odf/mco/types';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useK8sList } from '@odf/shared/hooks';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidatedProp } from '@odf/shared/utils';
import {
  Alert,
  AlertVariant,
  Form,
  FormGroup,
  FormSection,
  SelectOption,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import {
  EnrollDiscoveredApplicationAction,
  EnrollDiscoveredApplicationState,
  EnrollDiscoveredApplicationStateType,
} from '../../utils/reducer';
import { NamespaceSelectionTable } from './namesapce-table';
import './namespace-step.scss';

const getDRClusterFromPolicies = (drPolicies: DRPolicyKind[]): string[] => {
  // Only DRCluster names will be displayed for the selection.
  const drClusters: string[] = [];
  drPolicies?.forEach((policy) => drClusters.push(...policy.spec.drClusters));
  return [...new Set(drClusters)];
};

const clusterOptions = (clusters: string[]): JSX.Element[] =>
  clusters?.map((cluster) => (
    <SelectOption
      id={cluster}
      key={cluster}
      data-test="cluster-dropdown-item"
      value={cluster}
    />
  ));

export const NamespaceSelection: React.FC<NamespaceSelectionProps> = ({
  state,
  isValidationEnabled,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const [drPolicies, loaded, loadError] =
    useK8sList<DRPolicyKind>(DRPolicyModel);

  const { clusterName, namespaces } = state.namespace;
  const clusterNameHelperText = t(
    'Select a DRCluster to choose your namespace.'
  );
  const noClusterHelperText = t('No DR cluster found');

  const drClusters = getDRClusterFromPolicies(drPolicies);

  const clusterNamevalidated = getValidatedProp(
    (isValidationEnabled && !clusterName) || !drClusters.length
  );

  const setSelectedClusterName = (selectedClusterName: string) => {
    dispatch({
      type: EnrollDiscoveredApplicationStateType.SET_CLUSTER_NAME,
      payload: selectedClusterName,
    });
  };

  return (
    <>
      {loaded && !loadError ? (
        <Form maxWidth="58rem">
          <FormSection title={t('Namespace selection')}>
            <Text component={TextVariants.small}>
              {t(
                'Enable disaster recovery protection by selecting the namespaces of your ACM discovered application.'
              )}
            </Text>
            <FormGroup
              className="pf-v5-u-w-50"
              label={t('DR cluster')}
              helperTextInvalid={
                !drClusters.length ? noClusterHelperText : clusterNameHelperText
              }
              fieldId="managed-cluster-selection"
              isRequired
              validated={clusterNamevalidated}
            >
              <SingleSelectDropdown
                id="managed-cluster-dropdown"
                placeholderText={t('Select cluster')}
                selectedKey={clusterName}
                selectOptions={clusterOptions(drClusters)}
                onChange={setSelectedClusterName}
                validated={clusterNamevalidated}
                isDisabled={!drClusters.length}
              />
            </FormGroup>
            <FormGroup
              label={t('Namespace')}
              helperText={t(
                'Select namespaces that belongs to your ACM discovered applications.'
              )}
              fieldId="multi-namespace-selection"
              isRequired
              isHelperTextBeforeField
            >
              <Alert
                className="odf-alert pf-v5-u-mt-sm"
                title={t(
                  'Once you select namespaces, applications regardless of their type, within those namespaces cannot be subsequently enrolled separately under disaster recovery protection.'
                )}
                variant={AlertVariant.info}
                isInline
              />
              <NamespaceSelectionTable
                namespaces={namespaces}
                clusterName={clusterName}
                policies={drPolicies}
                isValidationEnabled={isValidationEnabled}
                dispatch={dispatch}
              />
            </FormGroup>
          </FormSection>
        </Form>
      ) : (
        <StatusBox loaded={loaded} loadError={loadError} />
      )}
    </>
  );
};

type NamespaceSelectionProps = {
  state: EnrollDiscoveredApplicationState;
  isValidationEnabled: boolean;
  dispatch: React.Dispatch<EnrollDiscoveredApplicationAction>;
};
