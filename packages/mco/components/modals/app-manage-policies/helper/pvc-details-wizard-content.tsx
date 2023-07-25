import * as React from 'react';
import { useACMSafeFetch } from '@odf/mco/hooks/acm-safe-fetch';
import { DRPlacementControlModel } from '@odf/mco/models';
import { SearchResult } from '@odf/mco/types';
import { MultiSelectDropdown } from '@odf/shared/dropdown/multiselectdropdown';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  PairElementProps,
  LazyNameValueEditor,
  NameValueEditorPair,
} from '@odf/shared/utils/NameValueEditor';
import { ObjectReference } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import {
  Alert,
  AlertVariant,
  Button,
  Form,
  FormGroup,
  SelectOption,
  SelectVariant,
  Text,
} from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { queryAppWorkloadPVCs } from '../utils/acm-search-quries';
import { getClusterNamesFromPlacements } from '../utils/parser-utils';
import { PlacementType, DRPlacementControlType } from '../utils/types';
import '../../../../style.scss';
import '../style.scss';

const LABEL = 'label';
const SPLIT_CHAR = '; ';

const findPlacement = (placements: PlacementType[], name: string) =>
  placements.find((placement) => getName(placement) === name);

const getPlacementTags = (drpcs: DRPlacementControlType[]) =>
  !!drpcs.length
    ? drpcs.map((drpc) => [getName(drpc.placementInfo), drpc?.pvcSelector])
    : [[]];

const getLabelsFromSearchResult = (searchResult: SearchResult): string[] => {
  const pvcLabels =
    searchResult?.data.searchResult?.[0]?.items.reduce(
      (acc, item) => [...acc, ...(item[LABEL]?.split(SPLIT_CHAR) || [])],
      []
    ) || [];
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

const createDRPlacementControlObj = (
  placement: PlacementType,
  dataPolicyRef: ObjectReference
): DRPlacementControlType => ({
  apiVersion: DRPlacementControlModel.apiVersion,
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: `${getName(placement)}-drpc`,
    namespace: getNamespace(placement),
  },
  drPolicyRef: dataPolicyRef,
  placementInfo: placement,
  pvcSelector: [],
});

const updateLabels = (
  drPlacementControl: DRPlacementControlType,
  labels: string[]
): DRPlacementControlType => ({
  ...drPlacementControl,
  pvcSelector: labels,
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
  const {
    placementNames,
    labels,
    tags,
    createPlacementControlInfo,
    updatePlacementControlInfo,
  }: extraProps = extraProps;
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
      createPlacementControlInfo(placement, index);
    },
    [index, onChange, createPlacementControlInfo]
  );

  const onChangeValue = React.useCallback(
    (values: string[]) => {
      onChange({ target: { value: values } }, index, NameValueEditorPair.Value);
      updatePlacementControlInfo(values, index);
    },
    [index, onChange, updatePlacementControlInfo]
  );

  const onRemove = React.useCallback(() => {
    onRemoveProp(index);
    createPlacementControlInfo('', index);
  }, [index, onRemoveProp, createPlacementControlInfo]);

  return (
    <div className="row pairs-list__row" data-test="pairs-list-row">
      <div className="col-xs-5 pairs-list__name-field">
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
        />
      </div>
      <div className="col-xs-5 pairs-list__value-field">
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
        />
      </div>
      <div className="col-xs-1 pairs-list__action">
        <Button
          type="button"
          data-test="delete-button"
          onClick={onRemove}
          isDisabled={isEmpty && !alwaysAllowRemove}
          variant="plain"
        >
          {deleteIcon}
        </Button>
      </div>
    </div>
  );
};

export const PVCDetailsWizardContent: React.FC<PVCDetailsWizardContentProps> =
  ({
    placementControInfo,
    unProtectedPlacements,
    policyRef,
    workloadNamespace,
    setDRPlacementControls,
  }) => {
    const { t } = useCustomTranslation();

    // To update placement and label info
    const selectedPlacementControls = React.useMemo(
      () => _.cloneDeep(placementControInfo) || [],
      [placementControInfo]
    );

    // Selected placement and labels
    const [tags, setTags] = React.useState<TagsType>(
      getPlacementTags(selectedPlacementControls)
    );

    // ACM search proxy api call
    const [searchResult] = useACMSafeFetch(
      queryAppWorkloadPVCs(
        workloadNamespace,
        getClusterNamesFromPlacements(unProtectedPlacements)
      )
    );

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

    const createPlacementControlInfo = React.useCallback(
      (placementName: string, index: number) => {
        if (!placementName) {
          // unselect
          selectedPlacementControls.splice(index, 1);
        } else {
          // select
          const placement = findPlacement(unProtectedPlacements, placementName);
          const drPlacementControlObj = createDRPlacementControlObj(
            placement,
            policyRef
          );
          selectedPlacementControls[index] = drPlacementControlObj;
        }
        setDRPlacementControls(selectedPlacementControls);
      },
      [
        selectedPlacementControls,
        unProtectedPlacements,
        policyRef,
        setDRPlacementControls,
      ]
    );

    const updatePlacementControlInfo = React.useCallback(
      (pvcLabels: string[], index: number) => {
        selectedPlacementControls[index] = updateLabels(
          selectedPlacementControls[index],
          pvcLabels
        );
        setDRPlacementControls(selectedPlacementControls);
      },
      [selectedPlacementControls, setDRPlacementControls]
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
        <FormGroup>
          <Alert
            title={t(
              'If no label is provided, all PVCs will be protected. Define your preferences to protect specific resources.'
            )}
            variant={AlertVariant.info}
            isInline
            className="odf-alert mco-manage-policies__alert--margin-bottom"
          />
        </FormGroup>
        <FormGroup>
          <LazyNameValueEditor
            nameValuePairs={tags}
            updateParentData={({ nameValuePairs }) => setTags(nameValuePairs)}
            PairElementComponent={PairElement}
            nameString={t('Application resource')}
            valueString={t('PVC label selector')}
            addString={t('Add application resource')}
            isAddDisabled={tags.length !== selectedPlacementControls.length}
            extraProps={{
              placementNames,
              labels,
              tags,
              createPlacementControlInfo,
              updatePlacementControlInfo,
            }}
          />
        </FormGroup>
      </Form>
    );
  };

type TagsType = (string | string[])[][];

type extraProps = {
  placementNames: string[];
  labels: string[];
  tags: TagsType;
  createPlacementControlInfo: (placementName: string, index: number) => void;
  updatePlacementControlInfo: (labels: string[], index: number) => void;
};

type PVCDetailsWizardContentProps = {
  placementControInfo: DRPlacementControlType[];
  unProtectedPlacements: PlacementType[];
  policyRef: ObjectReference;
  workloadNamespace: string;
  setDRPlacementControls: (
    drPlacementControls: DRPlacementControlType[]
  ) => void;
};
