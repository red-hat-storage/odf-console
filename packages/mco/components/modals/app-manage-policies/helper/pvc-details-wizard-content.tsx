import * as React from 'react';
import {
  DR_BLOCK_LISTED_LABELS,
  LABEL,
  LABEL_SPLIT_CHAR,
  LABELS_SPLIT_CHAR,
} from '@odf/mco/constants';
import { useACMSafeFetch } from '@odf/mco/hooks/acm-safe-fetch';
import { SearchResult } from '@odf/mco/types';
import { MultiSelectDropdown } from '@odf/shared/dropdown/multiselectdropdown';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import { StatusBox } from '@odf/shared/generic/status-box';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidatedProp } from '@odf/shared/utils';
import {
  LazyNameValueEditor,
  NameValueEditorPair,
  PairElementProps,
} from '@odf/shared/utils/NameValueEditor';
import * as _ from 'lodash-es';
import {
  Button,
  ButtonVariant,
  Form,
  FormGroup,
  Grid,
  GridItem,
  Popover,
  SelectOption,
} from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import '../../../../style.scss';
import { queryAppWorkloadPVCs } from '../../../../utils/acm-search-queries';
import '../style.scss';
import {
  ManagePolicyStateAction,
  ManagePolicyStateType,
  ModalViewContext,
  PVCSelectorType,
} from '../utils/reducer';
import { PlacementType, PVCQueryFilter } from '../utils/types';
import {
  getLabelValidationMessage,
  isValidLabelInput,
} from './assign-policy-view-footer';

const getPlacementTags = (pvcSelectors: PVCSelectorType[]): TagsType =>
  !!pvcSelectors.length
    ? pvcSelectors.map((pvcSelector, index) => [
        pvcSelector.placementName,
        pvcSelector.labels,
        index,
      ])
    : [['', [], 0]];

const getLabelsFromSearchResult = (searchResult: SearchResult): string[] => {
  const pvcLabels =
    searchResult?.data.searchResult?.[0]?.related?.[0]?.items?.reduce(
      (acc, item) => {
        const labels: string[] = item[LABEL]?.split(LABELS_SPLIT_CHAR) || [];
        const filteredLabels = labels?.filter((label) => {
          const [key] = label.split(LABEL_SPLIT_CHAR);
          return !DR_BLOCK_LISTED_LABELS.includes(key);
        });
        return [...acc, ...filteredLabels];
      },
      []
    ) || [];
  return Array.from(new Set(pvcLabels));
};

const getLabelsFromTags = (tags: TagsType, currIndex: number): string[] =>
  tags.reduce((acc, tag, index) => {
    const labels: string[] =
      (tag?.[NameValueEditorPair.Value] as string[]) || [];
    return currIndex !== index ? [...acc, ...labels] : acc;
  }, []) as string[];

const getPlacementsFromTags = (tags: TagsType, currIndex: number): string[] =>
  tags.reduce((acc, tag, index) => {
    const placement: string = tag?.[NameValueEditorPair.Name] as string;
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
    <SelectOption key={name} value={name}>
      {name}
    </SelectOption>
  ));
};

const getLabelsDropdownOptions = (
  labels: string[],
  selectedLabels: string[]
): JSX.Element[] => {
  // Display labels names except selected from other indexes
  return labels.reduce(
    (acc, name) =>
      !selectedLabels.includes(name)
        ? [
            ...acc,
            <SelectOption key={name} value={name}>
              {name}
            </SelectOption>,
          ]
        : acc,
    []
  );
};

const getPVCSelectors = (
  nameValuePairs: TagsType,
  protectedPlacementNames: string[]
): PVCSelectorType[] =>
  nameValuePairs.reduce((acc, pair) => {
    const pvcSelector = {
      placementName: pair[NameValueEditorPair.Name] as string,
      labels: pair[NameValueEditorPair.Value] as string[],
    };
    return protectedPlacementNames.includes(pvcSelector.placementName)
      ? acc
      : [...acc, pvcSelector];
  }, [] as PVCSelectorType[]);

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
  const {
    unProtectedPlacementNames,
    labels,
    tags,
    isValidationEnabled,
    protectedPlacementNames,
  }: ExtraProps = extraProps;
  const selectedPlacement = pair[NameValueEditorPair.Name];
  const selectedLabels = pair[NameValueEditorPair.Value];
  // Disable already protected placements for edit mode
  const isDisabled = protectedPlacementNames.includes(selectedPlacement);
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
        <FormGroup hasNoPaddingTop isRequired>
          <SingleSelectDropdown
            id="placement-selection-dropdown"
            selectedKey={selectedPlacement}
            selectOptions={getPlacementDropdownOptions(
              unProtectedPlacementNames,
              tags,
              index
            )}
            placeholderText={t('Select a placement')}
            onChange={onChangePlacement}
            required
            validated={getValidatedProp(
              isValidationEnabled && !selectedPlacement
            )}
            isDisabled={isDisabled}
          />
        </FormGroup>
      </GridItem>

      <GridItem lg={5} sm={5}>
        <FormGroup hasNoPaddingTop isRequired>
          <MultiSelectDropdown
            id="labels-selection-dropdown"
            selections={selectedLabels}
            onChange={onChangeValue}
            selectOptions={getLabelsDropdownOptions(
              labels,
              getLabelsFromTags(tags, index)
            )}
            placeholderText={
              !!selectedLabels?.length
                ? t('{{count}} selected', { count: selectedLabels?.length })
                : t('Select labels')
            }
            variant={'checkbox'}
            validated={getValidatedProp(
              isValidationEnabled && !isValidLabelInput(selectedLabels)
            )}
            isDisabled={isDisabled}
            popperProps={{
              position: 'right',
            }}
            isCreatable={true}
            hasInlineFilter={true}
          />
        </FormGroup>
      </GridItem>
      <GridItem lg={2} sm={2}>
        <FormGroup hasNoPaddingTop>
          <Button
            icon={deleteIcon}
            type="button"
            data-test="delete-button"
            onClick={onRemove}
            isDisabled={(isEmpty && !alwaysAllowRemove) || isDisabled}
            variant="plain"
          />
        </FormGroup>
      </GridItem>
    </Grid>
  );
};

export const PVCDetailsWizardContent: React.FC<
  PVCDetailsWizardContentProps
> = ({
  pvcSelectors,
  unProtectedPlacements,
  isValidationEnabled,
  protectedPVCSelectors,
  dispatch,
  pvcQueryFilter,
}) => {
  const { t } = useCustomTranslation();

  // To update placement and label info
  const selectedPVCSelectors = React.useMemo(
    () => _.cloneDeep(pvcSelectors) || [],
    [pvcSelectors]
  );

  // Selected placement and labels
  const [tags, setTags] = React.useState<TagsType>(
    getPlacementTags([...protectedPVCSelectors, ...selectedPVCSelectors])
  );

  // ACM search proxy api call
  const searchQuery = React.useMemo(
    () => queryAppWorkloadPVCs(pvcQueryFilter),
    [pvcQueryFilter]
  );
  const [searchResult, error, loaded] = useACMSafeFetch(searchQuery);

  // All labels
  const labels: string[] = React.useMemo(
    () => getLabelsFromSearchResult(searchResult),
    [searchResult]
  );

  // All unprotected placements
  const unProtectedPlacementNames: string[] =
    unProtectedPlacements.map(getName);

  // All protected placements
  const protectedPlacementNames: string[] = protectedPVCSelectors.map(
    (pvcSelector) => pvcSelector.placementName
  );

  return (
    <Form>
      <FormGroup>
        <span>
          {t(
            'Use PVC label selectors to effortlessly specify the application resources that need protection. You can also create a custom PVC label selector if one doesn’t exists. For more information, '
          )}
        </span>
        <Popover
          aria-label={t('Help')}
          bodyContent={getLabelValidationMessage(t)}
        >
          <Button aria-label={t('Help')} variant={ButtonVariant.link} isInline>
            {t('see PVC label selector requirements.')}
          </Button>
        </Popover>
      </FormGroup>
      {loaded && !error ? (
        <LazyNameValueEditor
          nameValuePairs={tags}
          updateParentData={({ nameValuePairs }) => {
            setTags(nameValuePairs);
            dispatch({
              type: ManagePolicyStateType.SET_PVC_SELECTORS,
              context: ModalViewContext.ASSIGN_POLICY_VIEW,
              payload: getPVCSelectors(nameValuePairs, protectedPlacementNames),
            });
          }}
          PairElementComponent={PairElement}
          nameString={t('Application resource')}
          valueString={t('PVC label selector')}
          addString={t('Add application resource')}
          extraProps={{
            unProtectedPlacementNames,
            labels,
            tags,
            isValidationEnabled,
            protectedPlacementNames,
          }}
          className="co-required mco-manage-policies__nameValue--weight"
        />
      ) : (
        <StatusBox loaded={loaded} loadError={error} />
      )}
    </Form>
  );
};

type TagsType = (string | string[] | number)[][];

type ExtraProps = {
  unProtectedPlacementNames: string[];
  labels: string[];
  tags: TagsType;
  isValidationEnabled: boolean;
  protectedPlacementNames: string[];
};

type PVCDetailsWizardContentProps = {
  pvcSelectors: PVCSelectorType[];
  unProtectedPlacements: PlacementType[];
  isValidationEnabled: boolean;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
  protectedPVCSelectors: PVCSelectorType[];
  pvcQueryFilter: PVCQueryFilter;
};
