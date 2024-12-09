import * as React from 'react';
import { ConsistencyGroupCheckBox } from '@odf/mco/components/modals/app-manage-policies/helper/pvc-details-wizard-content';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Alert,
  AlertVariant,
  Form,
  FormGroup,
  FormSection,
  Grid,
  GridItem,
  Radio,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import {
  EnrollDiscoveredApplicationAction,
  EnrollDiscoveredApplicationState,
  EnrollDiscoveredApplicationStateType,
  ProtectionMethodType,
} from '../../utils/reducer';
import { RecipeSelection } from './recipe-selection';
import { ResourceLabelSelection } from './resource-label-selection';
import './configuration-step.scss';

const RADIO_GROUP_NAME = 'k8s_object_protection_method';

export const Configuration: React.FC<ConfigurationProps> = ({
  state,
  isValidationEnabled,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const { namespaces, clusterName } = state.namespace;
  const {
    protectionMethod,
    recipe,
    resourceLabels,
    isConsistencyGroupEnabled,
  } = state.configuration;

  const setProtectionMethod = (_unUsed, event) => {
    dispatch({
      type: EnrollDiscoveredApplicationStateType.SET_PROTECTION_METHOD,
      payload: event.target.value,
    });
  };

  const consistencyGroupOnChange = (checked: boolean) => {
    dispatch({
      type: EnrollDiscoveredApplicationStateType.ENABLE_CONSISTENCY_GROUP,
      payload: checked,
    });
  };

  return (
    <Form maxWidth="58rem">
      <FormSection title={t('Configure definition')}>
        <Text component={TextVariants.small}>
          {t(
            'Choose your configuration preference to protect resources (application volumes/PVCs, or Kubernetes objects).'
          )}
        </Text>
        <Alert
          className="odf-alert pf-v5-u-mb-xs pf-v5-u-pl-md"
          title={t(
            'You have selected {{count}} namespaces, to view or change your selection go back to the previous step.',
            { count: namespaces.length }
          )}
          variant={AlertVariant.info}
          isPlain
          isInline
        />
        <FormGroup fieldId="protection-method-selection">
          <Grid hasGutter>
            <GridItem
              span={6}
              className="mco-configuration-step__radio pf-v5-u-p-lg"
            >
              <Radio
                id="label-based-protection"
                name={RADIO_GROUP_NAME}
                value={ProtectionMethodType.RESOURCE_LABEL}
                description={t(
                  'Secure selected namespace by defining resource label expressions.'
                )}
                label={<strong>{t('Resource label')} </strong>}
                onChange={(event, _unUsed) =>
                  setProtectionMethod(_unUsed, event)
                }
                isChecked={
                  protectionMethod === ProtectionMethodType.RESOURCE_LABEL
                }
              />
            </GridItem>
            <GridItem
              span={6}
              className="mco-configuration-step__radio pf-v5-u-p-lg"
            >
              <Radio
                id="recipe-based-protection"
                name={RADIO_GROUP_NAME}
                value={ProtectionMethodType.RECIPE}
                description={t('Secure namespaces as per Recipe definition.')}
                label={<strong>{t('Recipe')}</strong>}
                onChange={(event, _unUsed) =>
                  setProtectionMethod(_unUsed, event)
                }
                isChecked={protectionMethod === ProtectionMethodType.RECIPE}
              />
            </GridItem>
          </Grid>
        </FormGroup>
        {protectionMethod === ProtectionMethodType.RECIPE && (
          <RecipeSelection
            recipeName={recipe.recipeName}
            recipeNamespace={recipe.recipeNamespace}
            clusterName={clusterName}
            namespaces={namespaces}
            isValidationEnabled={isValidationEnabled}
            dispatch={dispatch}
          />
        )}
        {protectionMethod === ProtectionMethodType.RESOURCE_LABEL && (
          <ResourceLabelSelection
            k8sResourceLabelExpressions={
              resourceLabels.k8sResourceLabelExpressions
            }
            pvcLabelExpressions={resourceLabels.pvcLabelExpressions}
            clusterName={clusterName}
            namespaces={namespaces}
            isValidationEnabled={isValidationEnabled}
            dispatch={dispatch}
          />
        )}
        <ConsistencyGroupCheckBox
          isConsistencyGroupEnabled={isConsistencyGroupEnabled}
          onChange={consistencyGroupOnChange}
        />
      </FormSection>
    </Form>
  );
};

type ConfigurationProps = {
  state: EnrollDiscoveredApplicationState;
  isValidationEnabled: boolean;
  dispatch: React.Dispatch<EnrollDiscoveredApplicationAction>;
};
