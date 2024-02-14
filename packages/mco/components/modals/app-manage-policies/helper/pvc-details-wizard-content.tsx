import * as React from 'react';
import {
  LABEL,
  LABELS_SPLIT_CHAR,
  DR_BLOCK_LISTED_LABELS,
  LABEL_SPLIT_CHAR,
} from '@odf/mco/constants';
import { useACMSafeFetch } from '@odf/mco/hooks/acm-safe-fetch';
import { SearchResult } from '@odf/mco/types';
import { MultiSelectDropdown } from '@odf/shared/dropdown/multiselectdropdown';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidatedProp } from '@odf/shared/utils';
import {
  PairElementProps,
  LazyNameValueEditor,
  NameValueEditorPair,
} from '@odf/shared/utils/NameValueEditor';
import * as _ from 'lodash-es';
import {
  Button,
  Form,
  FormGroup,
  Grid,
  GridItem,
  SelectOption,
  SelectVariant,
  Text,
} from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { queryAppWorkloadPVCs } from '../utils/acm-search-quries';
import { getClusterNamesFromPlacements } from '../utils/parser-utils';
import {
  ManagePolicyStateAction,
  ManagePolicyStateType,
  ModalViewContext,
  PVCSelectorType,
} from '../utils/reducer';
import { PlacementType } from '../utils/types';
import '../../../../style.scss';
import '../style.scss';

const getPlacementTags = (pvcSelectors: PVCSelectorType[]) =>
  !!pvcSelectors.length
    ? pvcSelectors.map((pvcSelector) => [
        pvcSelector.placementName,
        pvcSelector.labels,
      ])
    : [[]];

const getLabelsFromSearchResult = (searchResult: SearchResult): string[] => {
  const pvcLabels =
    searchResult?.data.searchResult?.[0]?.items.reduce((acc, item) => {
      const labels: string[] = item[LABEL]?.split(LABELS_SPLIT_CHAR) || [];
      const filteredLabels = labels?.filter((label) => {
        const [key] = label.split(LABEL_SPLIT_CHAR);
        return !DR_BLOCK_LISTED_LABELS.includes(key);
      });
      return [...acc, ...filteredLabels];
    }, []) || [];
  return Array.from(new Set(pvcLabels));
};

const getLabelsFromTags = (tags: TagsType, currIndex: number): string[] =>
  tags.reduce((acc, tag, index) => {
    const labels: string[] = (tag?.[1] || []) as string[];
    return currIndex !== index ? [...acc, ...labels] : acc;
  }, []) as string[];

const getPlacementsFromTags = (tags: TagsType, currIndex: number): string[] =>
  tags.reduce((acc, tag, index) => {
    const placement: string = tag?.[0] as string;
    return currIndex !== index ? [...acc, placement] : acc;
  }, []) as string[];

const getPlacementDropdownOptions = (
  placementNames: string[],
  tags: TagsType,
  currIndex: number
) => {
  // Display placement names except selected from other indexes
  const selectedNames = getPlacementsFromTags(tags, currIndex);
  const shortListedNames = placementNames.filter(
    (name) => !selectedNames.includes(name)
  );
  return shortListedNames.map((name) => (
    <SelectOption key={name} value={name} />
  ));
};

const getLabelsDropdownOptions = (
  labels: string[],
  tags: TagsType,
  currIndex: number
) => {
  // Display labels names except selected from other indexes
  const selectedLabels = getLabelsFromTags(tags, currIndex);
  return labels.filter((name) => !selectedLabels.includes(name));
};

const getPVCSelectors = (nameValuePairs: TagsType): PVCSelectorType[] =>
  nameValuePairs.map((pair) => {
    return {
      placementName: pair[NameValueEditorPair.Name] as string,
      labels: pair[NameValueEditorPair.Value] as string[],
    };
  });

const PairElement: React.FC<PairElementProps> = ({
  index,
  onRemove: onRemoveProp,
  onChange,
  isEmpty,
  alwaysAllowRemove,
  pair,
  extraProps,
}) => {
  const { t } = useCustomTranslation();
  const { placementNames, labels, tags, isValidationEnabled }: extraProps =
    extraProps;
  const selectedPlacement = pair[NameValueEditorPair.Name];
  const selectedLabels = pair[NameValueEditorPair.Value];
  const deleteIcon = (
    <>
      <MinusCircleIcon className="pairs-list__side-btn pairs-list__delete-icon" />
      <span className="sr-only">{t('Delete')}</span>
    </>
  );

  const onChangePlacement = React.useCallback(
    (placement: string) => {
      onChange(
        { target: { value: placement } },
        index,
        NameValueEditorPair.Name
      );
    },
    [index, onChange]
  );

  const onChangeValue = React.useCallback(
    (values: string[]) => {
      onChange({ target: { value: values } }, index, NameValueEditorPair.Value);
    },
    [index, onChange]
  );

  const onRemove = React.useCallback(() => {
    onRemoveProp(index);
  }, [index, onRemoveProp]);

  return (
    <Grid hasGutter>
      <GridItem lg={5} sm={5}>
        <FormGroup
          hasNoPaddingTop
          isRequired
          validated={getValidatedProp(
            isValidationEnabled && !selectedPlacement
          )}
          helperTextInvalid={t('Required')}
        >
          <SingleSelectDropdown
            id="placement-selection-dropdown"
            selectedKey={selectedPlacement}
            selectOptions={getPlacementDropdownOptions(
              placementNames,
              tags,
              index
            )}
            placeholderText={t('Select a placement')}
            onChange={onChangePlacement}
            required
            validated={getValidatedProp(
              isValidationEnabled && !selectedPlacement
            )}
          />
        </FormGroup>
      </GridItem>
      <GridItem lg={5} sm={5}>
        <FormGroup
          hasNoPaddingTop
          isRequired
          validated={getValidatedProp(
            isValidationEnabled && !selectedLabels?.length
          )}
          helperTextInvalid={t('Required')}
        >
          <MultiSelectDropdown
            id="labels-selection-dropdown"
            selections={selectedLabels}
            onChange={onChangeValue}
            options={
              // Display labels only after placement is selected
              !!selectedPlacement
                ? getLabelsDropdownOptions(labels, tags, index)
                : []
            }
            placeholderText={
              !!selectedLabels?.length
                ? t('{{count}} selected', { count: selectedLabels?.length })
                : t('Select labels')
            }
            variant={SelectVariant.checkbox}
            required
            validated={getValidatedProp(
              isValidationEnabled && !selectedLabels?.length
            )}
          />
        </FormGroup>
      </GridItem>
      <GridItem lg={2} sm={2}>
        <FormGroup hasNoPaddingTop>
          <Button
            type="button"
            data-test="delete-button"
            onClick={onRemove}
            isDisabled={isEmpty && !alwaysAllowRemove}
            variant="plain"
          >
            {deleteIcon}
          </Button>
        </FormGroup>
      </GridItem>
    </Grid>
  );
};

export const PVCDetailsWizardContent: React.FC<PVCDetailsWizardContentProps> =
  ({
    pvcSelectors,
    unProtectedPlacements,
    workloadNamespace,
    isValidationEnabled,
    dispatch,
  }) => {
    const { t } = useCustomTranslation();

    // To update placement and label info
    const selectedPVCSelectors = React.useMemo(
      () => _.cloneDeep(pvcSelectors) || [],
      [pvcSelectors]
    );

    // Selected placement and labels
    const [tags, setTags] = React.useState<TagsType>(
      getPlacementTags(selectedPVCSelectors)
    );

    // ACM search proxy api call
    const searchQuery = React.useMemo(
      () =>
        queryAppWorkloadPVCs(
          workloadNamespace,
          getClusterNamesFromPlacements(unProtectedPlacements)
        ),
      [unProtectedPlacements, workloadNamespace]
    );
    const [searchResult] = useACMSafeFetch(searchQuery);

    // All labels
    const labels: string[] = React.useMemo(
      () => getLabelsFromSearchResult(searchResult),
      [searchResult]
    );

    // All unprotected placements
    const placementNames: string[] = React.useMemo(
      () => unProtectedPlacements.map(getName),
      [unProtectedPlacements]
    );

    return (
      <Form>
        <FormGroup>
          <Text>
            {t(
              'Use PVC label selectors to effortlessly specify the application resources that need protection.'
            )}
          </Text>
        </FormGroup>
        <LazyNameValueEditor
          nameValuePairs={tags}
          updateParentData={({ nameValuePairs }) => {
            setTags(nameValuePairs);
            dispatch({
              type: ManagePolicyStateType.SET_PVC_SELECTORS,
              context: ModalViewContext.ASSIGN_POLICY_VIEW,
              payload: getPVCSelectors(nameValuePairs),
            });
          }}
          PairElementComponent={PairElement}
          nameString={t('Application resource')}
          valueString={t('PVC label selector')}
          addString={t('Add application resource')}
          extraProps={{
            placementNames,
            labels,
            tags,
            isValidationEnabled,
          }}
          className="co-required mco-manage-policies__nameValue--weight"
        />
      </Form>
    );
  };

type TagsType = (string | string[])[][];

type extraProps = {
  placementNames: string[];
  labels: string[];
  tags: TagsType;
  isValidationEnabled: boolean;
};

type PVCDetailsWizardContentProps = {
  pvcSelectors: PVCSelectorType[];
  unProtectedPlacements: PlacementType[];
  workloadNamespace: string;
  isValidationEnabled: boolean;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
};
