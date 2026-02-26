import * as React from 'react';
import { useACMSafeFetch } from '@odf/mco/hooks';
import { SearchResultItemType } from '@odf/mco/types';
import { queryRecipesFromCluster, getNameNamespace } from '@odf/mco/utils';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { StatusBox } from '@odf/shared/generic/status-box';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidatedProp } from '@odf/shared/utils';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  FormGroup,
  Content,
  FormHelperText,
  HelperText,
  HelperTextItem,
  SelectOption,
} from '@patternfly/react-core';
import {
  EnrollDiscoveredApplicationAction,
  EnrollDiscoveredApplicationStateType,
} from '../../utils/reducer';
import './configuration-step.scss';
import { RecipeParameterInput } from './recipe-parameter-input';

const getRecipeOptions = (
  searchResultItem: SearchResultItemType[]
): JSX.Element[] =>
  searchResultItem?.map((item) => {
    // Display each recipe name from selected cluster and namespaces as option
    const { name, namespace } = item;
    const recipeNamespaceName = getNameNamespace(name, namespace);
    return (
      <SelectOption
        id={recipeNamespaceName}
        key={recipeNamespaceName}
        data-test="cluster-dropdown-item"
        value={recipeNamespaceName}
        description={namespace}
      >
        {name}
      </SelectOption>
    );
  });

export const RecipeSelection: React.FC<RecipeSelectionProps> = ({
  recipeName,
  clusterName,
  recipeNamespace,
  namespaces,
  isValidationEnabled,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const searchQuery = React.useMemo(
    () => queryRecipesFromCluster(clusterName, namespaces.map(getName)),
    [clusterName, namespaces]
  );

  // ACM search proxy API call
  const [searchResult, searchError, searchLoaded] =
    useACMSafeFetch(searchQuery);

  const recipeOptions =
    searchLoaded && !searchError
      ? getRecipeOptions(searchResult?.data.searchResult?.[0]?.items || [])
      : [];

  // Multiple namespace can have recipe with same name,
  // Converting into name/namespace for unique identification in dropdown option
  const recipeNameNamespace = getNameNamespace(recipeName, recipeNamespace);
  // For no recipe found has different validation message
  // For recipe not selected has different validation message
  const recipeValidated = getValidatedProp(
    (isValidationEnabled && !recipeNamespace) || !recipeOptions.length
  );

  const setRecipeNameNamespace = (nameNamespace: string) =>
    dispatch({
      type: EnrollDiscoveredApplicationStateType.SET_RECIPE_NAME_NAMESPACE,
      payload: nameNamespace,
    });

  return (
    <>
      {/* todo(bipuladh): Add form validation again */}
      {searchLoaded && !searchError ? (
        <FormGroup
          label={t('Recipe list')}
          fieldId="recipe-selection"
          isRequired
        >
          <Content component="p">
            {t(
              'Only recipes of the selected namespaces will appear in the list.'
            )}
          </Content>
          <SingleSelectDropdown
            className="pf-v6-u-w-50 pf-v6-u-mt-sm"
            id="recipe-selection-dropdown"
            placeholderText={t('Select a recipe')}
            selectedKey={recipeNameNamespace}
            selectOptions={recipeOptions}
            onChange={setRecipeNameNamespace}
            required
            validated={recipeValidated}
            isDisabled={!recipeOptions.length}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={recipeValidated}>
                {!recipeOptions.length ? t('No recipe found') : t('Required')}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      ) : (
        <StatusBox loaded={searchLoaded} loadError={searchError} />
      )}

      {recipeNameNamespace && <RecipeParameterInput dispatch={dispatch} />}
    </>
  );
};

type RecipeSelectionProps = {
  // Selected recipe name
  recipeName: string;
  // Selected recipe namespace
  recipeNamespace: string;
  // Selected discovered application deployment cluster
  clusterName: string;
  // Selected discovered application namespaces
  namespaces: K8sResourceCommon[];
  // Form validation is enabled/disabled
  isValidationEnabled: boolean;
  // Update state
  dispatch: React.Dispatch<EnrollDiscoveredApplicationAction>;
};
