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
import { SelectOption } from '@patternfly/react-core/deprecated';
import {
  FormGroup,
  Text,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  Button,
  FlexItem,
  Flex,
  Tooltip,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import {
  EnrollDiscoveredApplicationAction,
  EnrollDiscoveredApplicationStateType,
} from '../../utils/reducer';
import './configuration-step.scss';

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
  const [keyValuePairs, setKeyValuePairs] = React.useState([
    { key: '', value: '' },
  ]);

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

  const removeKeyValuePair = (index: number) => {
    setKeyValuePairs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyValueChange = (
    index: number,
    field: 'key' | 'value',
    newValue: string
  ) => {
    setKeyValuePairs((prev) => {
      // Avoid redundant updates
      if (prev[index][field] === newValue) return prev;

      return prev.map((pair, i) =>
        i === index ? { ...pair, [field]: newValue } : pair
      );
    });
  };

  React.useEffect(() => {
    const validPairs = keyValuePairs.filter((pair) => pair.key.trim());
    dispatch({
      type: EnrollDiscoveredApplicationStateType.SET_RECIPE_PARAMETERS,
      payload: Object.fromEntries(
        validPairs.map(({ key, value }) => [key.trim(), value])
      ),
    });
  }, [dispatch, keyValuePairs]);

  const addKeyValuePair = () => {
    setKeyValuePairs((prev) => {
      // Check for empty keys in the latest state
      if (prev.some((pair) => !pair.key.trim())) return prev;
      return [...prev, { key: '', value: '' }];
    });
  };

  return (
    <>
      {/* todo(bipuladh): Add form validation again */}
      {searchLoaded && !searchError ? (
        <FormGroup
          label={t('Recipe list')}
          fieldId="recipe-selection"
          isRequired
        >
          <Text>
            {t(
              'Only recipes of the selected namespaces will appear in the list.'
            )}
          </Text>
          <SingleSelectDropdown
            className="pf-v5-u-w-50 pf-v5-u-mt-sm"
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
      {/* Key-Value Pair Input Fields */}
      {recipeNameNamespace && (
        <FormGroup
          label={t('Recipe Parameters')}
          fieldId="recipe-parameters"
          labelIcon={
            <Tooltip
              content={t(
                'Set of rules and configurations that govern how data is selected, stored, and restored.'
              )}
            >
              <span> ⓘ </span>
            </Tooltip>
          }
        >
          {keyValuePairs.map((pair, index) => (
            <Flex
              key={`${index}-${pair.key}`}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem>
                <TextInput
                  id={`key-${index}`}
                  placeholder={t('Key')}
                  value={pair.key}
                  onChange={(event) =>
                    handleKeyValueChange(
                      index,
                      'key',
                      event.currentTarget.value
                    )
                  }
                />
              </FlexItem>
              <FlexItem>
                <TextInput
                  id={`value-${index}`}
                  placeholder={t('Value')}
                  value={pair.value}
                  onChange={(event) =>
                    handleKeyValueChange(
                      index,
                      'value',
                      event.currentTarget.value
                    )
                  }
                />
              </FlexItem>
              <FlexItem>
                <Button
                  variant="plain"
                  onClick={() => removeKeyValuePair(index)}
                  aria-label={t('Remove parameter')}
                >
                  <MinusCircleIcon />
                </Button>
              </FlexItem>
            </Flex>
          ))}
          <Button
            variant="link"
            onClick={addKeyValuePair}
            isDisabled={keyValuePairs.some((pair) => !pair.key.trim())}
            icon={<PlusCircleIcon />}
          >
            {t('Add Parameter')}
          </Button>
        </FormGroup>
      )}
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
