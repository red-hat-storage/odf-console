import * as React from 'react';
import { getName, getUID } from '@odf/shared/selectors';
import {
  TopologySearchContext,
  TopologyDataContext,
  TopologyViewLevel,
} from '@odf/shared/topology';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import * as fuzzy from 'fuzzysearch';
import { SearchInput } from '@patternfly/react-core';
import { useVisualizationController } from '@patternfly/react-topology';
import { STEP_INTO_EVENT, STEP_TO_CLUSTER } from '../constants';

const useTopologySearch = () => {
  const { visualizationLevel, nodes, deployments } =
    React.useContext(TopologyDataContext);

  const { activeItemsUID, setActiveItemsUID } = React.useContext(
    TopologySearchContext
  );

  const controller = useVisualizationController();

  const performSearch = React.useCallback(
    (input) => {
      let resourcesInScope: K8sResourceCommon[] = nodes;
      if (visualizationLevel === TopologyViewLevel.DEPLOYMENTS) {
        const visibleElements = controller.getElements();
        const visibleIDs = visibleElements.map((element) => element.getId());
        const filteredDeployments = deployments.filter((deployment) =>
          visibleIDs.includes(deployment.metadata.uid)
        );
        resourcesInScope = filteredDeployments;
      }
      // Process the search now
      const filteredItems = resourcesInScope
        .filter((item) => {
          const itemName = getName(item);
          if (fuzzy(input, itemName)) {
            return true;
          }
          return false;
        })
        .map(getUID);
      setActiveItemsUID(filteredItems);
      return filteredItems;
    },
    [nodes, visualizationLevel, setActiveItemsUID, controller, deployments]
  );

  return { performSearch, activeItemsUID };
};

const SearchBar: React.FC = () => {
  const [userInput, setUserInput] = React.useState('');
  const [currentResult, setCurrentResult] = React.useState(0);
  const controller = useVisualizationController();

  const { performSearch, activeItemsUID } = useTopologySearch();

  const { setActiveItemsUID, setActiveItem } = React.useContext(
    TopologySearchContext
  );

  const resultsCount = activeItemsUID.length;

  const { t } = useCustomTranslation();

  const onChange = (event, input: string) => {
    setUserInput(input);
  };

  const onClear = React.useCallback(() => {
    setUserInput('');
    setCurrentResult(0);
    setActiveItemsUID([]);
    setActiveItem('');
  }, [setActiveItem, setActiveItemsUID]);

  const onSearch = () => {
    const items = performSearch(userInput);
    setActiveItem(items[0]);
  };

  const onNext = () => {
    const newCurrentResult = currentResult + 1;
    setCurrentResult(
      newCurrentResult > resultsCount ? resultsCount : newCurrentResult
    );
    setActiveItem(activeItemsUID[newCurrentResult]);
  };

  const onPrevious = () => {
    const newCurrentResult = currentResult - 1;
    setCurrentResult(newCurrentResult >= 0 ? newCurrentResult : 1);
    setActiveItem(activeItemsUID[newCurrentResult]);
  };

  React.useEffect(() => {
    controller.addEventListener(STEP_INTO_EVENT, onClear);
    controller.addEventListener(STEP_TO_CLUSTER, onClear);
    return () => {
      controller.removeEventListener(STEP_INTO_EVENT, onClear);
      controller.removeEventListener(STEP_TO_CLUSTER, onClear);
    };
  }, [controller, onClear]);

  return (
    <SearchInput
      isNextNavigationButtonDisabled={resultsCount === currentResult + 1}
      isPreviousNavigationButtonDisabled={currentResult === 0}
      value={userInput}
      placeholder={t('Search...')}
      onNextClick={onNext}
      onPreviousClick={onPrevious}
      onClear={onClear}
      onChange={onChange as any} // Todo(bipuladh): Types are wrong so using any. Fix types
      onSearch={onSearch}
      resultsCount={
        resultsCount > 0 ? `${currentResult + 1} of ${resultsCount}` : undefined
      }
    />
  );
};

export default SearchBar;
