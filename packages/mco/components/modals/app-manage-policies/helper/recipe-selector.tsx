import * as React from 'react';
import { HUB_CLUSTER_NAME, NAME } from '@odf/mco/constants';
import { useACMSafeFetch } from '@odf/mco/hooks';
import { ACMManagedClusterViewModel, DRRecipeModel } from '@odf/mco/models';
import { ACMManagedClusterViewKind, SearchResult } from '@odf/mco/types';
import { getValueFromSearchResult } from '@odf/mco/utils';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getAPIVersionForModel, getValidatedProp } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  k8sCreate,
} from '@openshift-console/dynamic-plugin-sdk';
import { safeDump } from 'js-yaml';
import * as Sha1 from 'sha1';
import {
  SelectOption,
  Form,
  FormGroup,
  CodeBlock,
  CodeBlockCode,
  Button,
  ButtonVariant,
} from '@patternfly/react-core';
import { queryResourceKind } from '../utils/acm-search-quries';
import { pollManagedClusterView } from '../utils/k8s-utils';
import {
  ManagePolicyStateAction,
  ManagePolicyStateType,
  ModalViewContext,
  RecipeInfoType,
} from '../utils/reducer';
import '../style.scss';

const generateOptionsFromSearchResult = (searchResult: SearchResult) =>
  getValueFromSearchResult(searchResult, NAME);

const getRecipeMCVPayload = (
  recipeInfo: RecipeInfoType,
  clusterNames: string[]
): ACMManagedClusterViewKind => {
  const { name: resourceName, namespace: resourceNamespace } = recipeInfo;
  const clusterName = clusterNames[0];
  const viewName = Sha1(
    `${clusterName}-${resourceName}-${DRRecipeModel.kind}`
  ).substr(0, 63);
  return {
    apiVersion: getAPIVersionForModel(ACMManagedClusterViewModel),
    kind: ACMManagedClusterViewModel.kind,
    metadata: { name: viewName, namespace: clusterName },
    spec: {
      scope: {
        name: resourceName,
        resource: DRRecipeModel.kind,
        namespace: resourceNamespace,
      },
    },
  };
};

export const RecipeSelector: React.FC<RecipeSelectorProps> = ({
  clusterNames,
  workLoadNamespace,
  isValidationEnabled,
  recipeInfo,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [recipe, selectRecipe] = React.useState(recipeInfo?.name);
  const [recipeYAML, setRecipeYAML] = React.useState('');
  const [isHideCodeBlock, setIsHideCodeBlock] = React.useState(true);
  // ACM search proxy api call
  const searchQuery = React.useMemo(
    () =>
      queryResourceKind(DRRecipeModel.kind, workLoadNamespace, clusterNames),
    [workLoadNamespace, clusterNames]
  );
  const [searchResult] = useACMSafeFetch(searchQuery);

  // Generate options
  const options = React.useMemo(
    () => generateOptionsFromSearchResult(searchResult) || [],
    [searchResult]
  );

  // Read recipe using MCV
  React.useEffect(() => {
    if (!!recipeInfo) {
      const recipeMCVPayload = getRecipeMCVPayload(recipeInfo, clusterNames);
      try {
        // Create recipe MCV
        k8sCreate({
          model: ACMManagedClusterViewModel,
          data: recipeMCVPayload,
          cluster: HUB_CLUSTER_NAME,
        }).then(() => {
          // Read and delete recipe MCV
          pollManagedClusterView<K8sResourceCommon>(
            getName(recipeMCVPayload),
            getNamespace(recipeMCVPayload),
            t
          ).then((viewResponse) =>
            setRecipeYAML(safeDump(viewResponse.result, { lineWidth: -1 }))
          );
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }
  }, [recipeInfo, clusterNames, setRecipeYAML, t]);

  const isVaildRecipe = getValidatedProp(isValidationEnabled && !recipe);
  const onChange = (selected: string) => {
    selectRecipe(selected);
    dispatch({
      type: ManagePolicyStateType.SET_RECIPE_INFO,
      context: ModalViewContext.ASSIGN_POLICY_VIEW,
      payload: {
        name: selected,
        namespace: workLoadNamespace,
      },
    });
  };

  return (
    <Form>
      <FormGroup
        className="mco-manage-policies__recipe--dropdown-wide"
        label={t('Recipe')}
        isRequired
        validated={isVaildRecipe}
        helperTextInvalid={t('Required')}
      >
        <SingleSelectDropdown
          id="recipe-selection-dropdown"
          data-test-id={'recipe-selection-dropdown-'}
          placeholderText={t('Select a recipe')}
          selectedKey={recipe}
          required
          validated={isVaildRecipe}
          selectOptions={options.map((option, i) => (
            <SelectOption
              className="mco-manage-policies__selector--font-size"
              key={i}
              value={option}
            />
          ))}
          onChange={onChange}
        />
      </FormGroup>
      {!!recipe && (
        <FormGroup>
          {!isHideCodeBlock && (
            <CodeBlock className="mco-manage-policies__codeblock--height">
              <CodeBlockCode>{recipeYAML}</CodeBlockCode>
            </CodeBlock>
          )}
          <Button
            className="pf-m-link--align-left"
            variant={ButtonVariant.link}
            onClick={() => setIsHideCodeBlock(!isHideCodeBlock)}
            isDisabled={!recipeYAML}
          >
            {!isHideCodeBlock
              ? t('Hide recipe details')
              : t('Show recipe details')}
          </Button>
        </FormGroup>
      )}
    </Form>
  );
};

type RecipeSelectorProps = {
  clusterNames: string[];
  workLoadNamespace: string;
  recipeInfo: RecipeInfoType;
  isValidationEnabled: boolean;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
};
