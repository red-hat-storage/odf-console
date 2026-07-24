import * as React from 'react';
import { GetBucketLifecycleConfigurationCommandOutput } from '@aws-sdk/client-s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  ContentVariants,
  Content,
  FormGroup,
  TextInput,
  Radio,
  Alert,
  AlertVariant,
  ValidatedOptions,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { StateAndDispatchProps, RuleActionType, RuleScope } from './reducer';
import { isInvalidName } from './validations';

const RADIO_GROUP_NAME = 'lifecycle-rule-scope-radio';

type GeneralConfigStepProps = StateAndDispatchProps & {
  existingRules: GetBucketLifecycleConfigurationCommandOutput;
  isEdit?: boolean;
  editingRuleName?: string;
};

export const GeneralConfigStep: React.FC<GeneralConfigStepProps> = ({
  state,
  dispatch,
  existingRules,
  isEdit,
  editingRuleName,
}) => {
  const { t } = useCustomTranslation();

  const [invalidName, emptyName, alreadyUsedName, exceedingLengthName] =
    state.triggerInlineValidations
      ? isInvalidName(state, existingRules, isEdit, editingRuleName)
      : [];

  return (
    <>
      <Content className="pf-v6-u-mb-lg">
        <Content component={ContentVariants.h2}>
          {t('General configuration')}
        </Content>
      </Content>

      <FormGroup
        label={t('Lifecycle rule name')}
        fieldId="name"
        className="pf-v6-u-mb-lg"
        isRequired
      >
        <TextInput
          id="name"
          value={state.name}
          onChange={(_e, value) =>
            dispatch({ type: RuleActionType.RULE_NAME, payload: value })
          }
          placeholder={t('Enter a valid rule name')}
          className="pf-v6-u-w-50"
          validated={
            invalidName ? ValidatedOptions.error : ValidatedOptions.default
          }
        />
        {invalidName && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={ValidatedOptions.error}>
                {emptyName && t('A rule name is required.')}
                {alreadyUsedName &&
                  t(
                    'A rule with this name already exists. Type a different name.'
                  )}
                {exceedingLengthName && t('No more than 255 characters')}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>

      <FormGroup label={t('Rule scope')} fieldId="scope">
        <span className="pf-v6-u-display-flex pf-v6-u-flex-direction-column">
          <Radio
            label={t('Targeted')}
            description={t(
              'Applies to a specific subset of objects within a bucket, based on defined criteria. Allows for more granular control over which objects the rule targets.'
            )}
            name={RADIO_GROUP_NAME}
            value={RuleScope.TARGETED}
            isChecked={state.scope === RuleScope.TARGETED}
            onChange={(event) =>
              dispatch({
                type: RuleActionType.RULE_SCOPE,
                payload: (event.target as HTMLInputElement).value as RuleScope,
              })
            }
            id={`scope-${RuleScope.TARGETED}`}
            className="pf-v6-u-mb-md"
          />
          <Radio
            label={t('Global (Bucket-wide)')}
            description={t(
              'Applies to all objects in the bucket without any filters. Uses the same lifecycle action for every object in the bucket.'
            )}
            name={RADIO_GROUP_NAME}
            value={RuleScope.GLOBAL}
            isChecked={state.scope === RuleScope.GLOBAL}
            onChange={(event) =>
              dispatch({
                type: RuleActionType.RULE_SCOPE,
                payload: (event.target as HTMLInputElement).value as RuleScope,
              })
            }
            id={`scope-${RuleScope.GLOBAL}`}
          />
        </span>
      </FormGroup>

      {state.scope === RuleScope.GLOBAL && (
        <Alert
          title={t('Global rule scope selected')}
          variant={AlertVariant.info}
          className="pf-v6-u-mt-md"
          isInline
        >
          {t(
            'You have selected to apply this lifecycle rule to all objects in the bucket. This may impact objects that do not require the specified expirations. If your bucket contains a mix of object types, consider using filters like prefixes or tags to target specific objects.'
          )}
        </Alert>
      )}
    </>
  );
};
