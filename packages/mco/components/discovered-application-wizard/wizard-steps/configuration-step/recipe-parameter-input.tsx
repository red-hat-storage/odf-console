import * as React from 'react';
import { FieldLevelHelp, useCustomTranslation } from '@odf/shared';
import { LazyNameValueEditor } from '@odf/shared/utils/NameValueEditor';
import { FormGroup } from '@patternfly/react-core';
import {
  EnrollDiscoveredApplicationAction,
  EnrollDiscoveredApplicationStateType,
} from '../../utils/reducer';

export const RecipeParameterInput: React.FC<RecipeParameterInputProps> = ({
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [recipeParams, setRecipeParams] = React.useState<[string, string][]>([
    ['', ''],
  ]);

  const updateRecipeParams = ({
    nameValuePairs,
  }: {
    nameValuePairs: [string, string][];
  }) => {
    setRecipeParams(nameValuePairs);
    const validPairs = nameValuePairs.filter(([key]) => key.trim());
    dispatch({
      type: EnrollDiscoveredApplicationStateType.SET_RECIPE_PARAMETERS,
      payload: Object.fromEntries(validPairs),
    });
  };

  return (
    <FormGroup
      label={t('Recipe parameters')}
      fieldId="recipe-parameters"
      labelHelp={
        <FieldLevelHelp>
          {t(
            'Recipe parameters are a set of named inputs that substitute the placeholders in a recipe.'
          )}
        </FieldLevelHelp>
      }
      data-test="recipe-parameters-form-group"
    >
      <LazyNameValueEditor
        data-test="recipe-parameters"
        nameValuePairs={recipeParams}
        updateParentData={updateRecipeParams}
        addString={t('Add parameter')}
        valueString={t('Value (optional)')}
        nameMaxLength={128}
        valueMaxLength={256}
      />
    </FormGroup>
  );
};

type RecipeParameterInputProps = {
  dispatch: React.Dispatch<EnrollDiscoveredApplicationAction>;
};
