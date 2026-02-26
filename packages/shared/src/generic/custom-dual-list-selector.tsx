import * as React from 'react';
import {
  DualListSelector,
  DualListSelectorControlsWrapper,
  DualListSelectorControl,
} from '@patternfly/react-core/deprecated';
import { SearchInput } from '@patternfly/react-core';
import {
  AngleDoubleLeftIcon,
  AngleDoubleRightIcon,
  AngleLeftIcon,
  AngleRightIcon,
} from '@patternfly/react-icons';

export const CustomDualListSelector = ({
  availableOptions,
  setAvailableOptions,
  chosenOptions,
  setChosenOptions,
  DualListSelectorAvailablePane,
  DualListSelectorChosenPane,
  searchFilterCondition,
  state = undefined,
  dispatch = undefined,
}) => {
  const [availableFilter, setAvailableFilter] = React.useState('');
  const [chosenFilter, setChosenFilter] = React.useState('');

  // callback for moving selected options between lists
  const moveSelected = (fromAvailable: boolean) => {
    const sourceOptions = fromAvailable ? availableOptions : chosenOptions;
    const destinationOptions = fromAvailable ? chosenOptions : availableOptions;
    for (let i = 0; i < sourceOptions.length; i++) {
      const option = sourceOptions[i];
      if (option.selected && option.isVisible) {
        sourceOptions.splice(i, 1);
        destinationOptions.push(option);
        option.selected = false;
        i--;
      }
    }
    if (fromAvailable) {
      setAvailableOptions([...sourceOptions]);
      setChosenOptions([...destinationOptions]);
    } else {
      setChosenOptions([...sourceOptions]);
      setAvailableOptions([...destinationOptions]);
    }
  };

  // callback for moving all options between lists
  const moveAll = (fromAvailable: boolean) => {
    if (fromAvailable) {
      setChosenOptions([
        ...availableOptions.filter((option) => option.isVisible),
        ...chosenOptions,
      ]);
      setAvailableOptions([
        ...availableOptions.filter((option) => !option.isVisible),
      ]);
    } else {
      setAvailableOptions([
        ...chosenOptions.filter((option) => option.isVisible),
        ...availableOptions,
      ]);
      setChosenOptions([
        ...chosenOptions.filter((option) => !option.isVisible),
      ]);
    }
  };

  // callback when option is selected
  const onOptionSelect = (
    _event: React.MouseEvent | React.ChangeEvent | React.KeyboardEvent,
    index: number,
    isChosen: boolean
  ) => {
    if (isChosen) {
      const newChosen = [...chosenOptions];
      newChosen[index].selected = !chosenOptions[index].selected;
      setChosenOptions(newChosen);
    } else {
      const newAvailable = [...availableOptions];
      newAvailable[index].selected = !availableOptions[index].selected;
      setAvailableOptions(newAvailable);
    }
  };

  // builds a search input - used in each dual list selector pane
  const buildSearchInput = (isAvailable: boolean) => {
    // **Note: PatternFly change the fn signature
    // From: (value: string, event: React.FormEvent<HTMLInputElement>) => void
    // To: (_event: React.FormEvent<HTMLInputElement>, value: string) => void
    // both cases need to be handled for backwards compatibility
    const onChange = (input: any) => {
      const value =
        typeof input === 'string'
          ? input
          : (input.target as HTMLInputElement).value;
      isAvailable ? setAvailableFilter(value) : setChosenFilter(value);
      const toFilter = isAvailable ? [...availableOptions] : [...chosenOptions];
      toFilter.forEach((option) => {
        option.isVisible = value === '' || searchFilterCondition(option, value);
      });
    };

    return (
      <SearchInput
        value={isAvailable ? availableFilter : chosenFilter}
        onChange={onChange}
        onClear={() => onChange('')}
      />
    );
  };

  return (
    <DualListSelector>
      <DualListSelectorAvailablePane
        availableOptions={availableOptions}
        chosenOptions={chosenOptions}
        buildSearchInput={buildSearchInput}
        onOptionSelect={onOptionSelect}
        state={state}
        dispatch={dispatch}
      />
      <DualListSelectorControlsWrapper>
        <DualListSelectorControl
          isDisabled={!availableOptions.some((option) => option.selected)}
          onClick={() => moveSelected(true)}
          aria-label="Add selected"
          tooltipContent="Add selected"
        >
          <AngleRightIcon />
        </DualListSelectorControl>
        <DualListSelectorControl
          isDisabled={availableOptions.length === 0}
          onClick={() => moveAll(true)}
          aria-label="Add all"
          tooltipContent="Add all"
        >
          <AngleDoubleRightIcon />
        </DualListSelectorControl>
        <DualListSelectorControl
          isDisabled={chosenOptions.length === 0}
          onClick={() => moveAll(false)}
          aria-label="Remove all"
          tooltipContent="Remove all"
        >
          <AngleDoubleLeftIcon />
        </DualListSelectorControl>
        <DualListSelectorControl
          onClick={() => moveSelected(false)}
          isDisabled={!chosenOptions.some((option) => option.selected)}
          aria-label="Remove selected"
          tooltipContent="Remove selected"
        >
          <AngleLeftIcon />
        </DualListSelectorControl>
      </DualListSelectorControlsWrapper>
      <DualListSelectorChosenPane
        chosenOptions={chosenOptions}
        buildSearchInput={buildSearchInput}
        onOptionSelect={onOptionSelect}
        state={state}
        dispatch={dispatch}
      />
    </DualListSelector>
  );
};
