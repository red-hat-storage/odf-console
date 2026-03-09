import * as React from 'react';
import {
  deviceTypeDropdownItems,
  diskModeDropdownItems,
  diskSizeUnitOptions,
  diskTypeDropdownItems,
  fsTypeDropdownItems,
} from '@odf/core/constants';
import { DiskType, NodeData } from '@odf/core/types';
import { STORAGE_SIZE_UNIT_NAME_MAP } from '@odf/shared/constants';
import { MultiSelectDropdown } from '@odf/shared/dropdown/multiselectdropdown';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { NodeKind } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import {
  Alert,
  AlertVariant,
  FormGroup,
  TextInput,
  Radio,
  ExpandableSection,
  TextInputTypes,
  Content,
  ContentVariants,
  Tooltip,
  SelectOption,
} from '@patternfly/react-core';
import { SelectNodesTable } from '../../create-storage-system/select-nodes-table/select-nodes-table';
import { createWizardNodeState } from '../../utils';
import { Action, State } from './state';
import '../../create-storage-system/create-storage-system-steps/create-local-volume-set-step/body.scss';

const fsTypeDropdownOptions: JSX.Element[] = _.map(
  fsTypeDropdownItems,
  (v, _unused) => (
    <SelectOption key={v} value={v}>
      {v}
    </SelectOption>
  )
);

const diskModeDropdownOptions: JSX.Element[] = _.map(
  diskModeDropdownItems,
  (v, _unused) => (
    <SelectOption key={v} value={v}>
      {v}
    </SelectOption>
  )
);

const diskSizeUnitDropdownOptions: JSX.Element[] = _.map(
  diskSizeUnitOptions,
  (v, _unused) => (
    <SelectOption key={v} value={v}>
      {v}
    </SelectOption>
  )
);

const deviceTypeDropdownOptions: (t: TFunction) => JSX.Element[] = (t) =>
  _.map(deviceTypeDropdownItems, (v) => (
    <SelectOption
      key={v}
      value={v}
      {...(v === deviceTypeDropdownItems.MPATH
        ? {
            description: t(
              'This selection is exclusive and cannot be used with other device types.'
            ),
          }
        : {})}
    >
      {v}
    </SelectOption>
  ));

const diskTypeDropdownOptions: (t: TFunction) => JSX.Element[] = (t) =>
  _.map(diskTypeDropdownItems(t), (v, _unused) => (
    <SelectOption key={v} value={v}>
      {v}
    </SelectOption>
  ));

export enum FilterDiskBy {
  ALL_NODES = 'all-nodes',
  SELECTED_NODES = 'selected-nodes',
}

const AllNodesLabel: React.FC<{ count: number }> = ({ count }) => {
  const { t } = useCustomTranslation();
  return (
    <>
      {t('Disks on all nodes')}
      {' ('}
      {t('{{nodes, number}} node', {
        nodes: count,
        count,
      })}
      {')'}
    </>
  );
};

const getDiskTypeValidationError = (state: State, t: TFunction) => {
  let validationError: {
    title: string;
    variant?: AlertVariant;
  };

  if (state.diskType === DiskType.All)
    validationError = {
      title: t(
        'All disk type may include HDD disks. Data Foundation does not support HDD disks as local devices. Select SSD if you plan to use Data Foundation.'
      ),
      variant: AlertVariant.info,
    };
  if (state.diskType === DiskType.HDD)
    validationError = {
      title: t(
        'Data Foundation does not support HDD disks as local devices. Select SSD if you plan to use Data Foundation.'
      ),
      variant: AlertVariant.info,
    };

  return validationError;
};

export const LocalVolumeSetBody: React.FC<LocalVolumeSetBodyProps> = ({
  dispatch,
  state,
}) => {
  const { t } = useCustomTranslation();

  const INTEGER_MAX_REGEX = /^\+?([1-9]\d*)$/;
  const INTEGER_MIN_REGEX = /^\+?([0-9]\d*)$/;
  const [activeMinDiskSize, setMinActiveState] = React.useState(false);
  const [activeMaxDiskSize, setMaxActiveState] = React.useState(false);
  const validMinDiskSize = INTEGER_MIN_REGEX.test(state.minDiskSize || '1');
  const validMaxDiskSize = INTEGER_MAX_REGEX.test(state.maxDiskSize || '1');
  const validMaxDiskLimit = INTEGER_MAX_REGEX.test(state.maxDiskLimit || '1');

  const invalidMinGreaterThanMax =
    state.minDiskSize !== '' &&
    state.maxDiskSize !== '' &&
    Number(state.minDiskSize) > Number(state.maxDiskSize);

  const toggleShowNodesList = () =>
    dispatch({ type: 'setLvsIsSelectNodes', value: !state.lvsIsSelectNodes });

  const diskSizeHelpText = t('Please enter a positive Integer');

  const onRowSelected = React.useCallback(
    (selectedNodes: NodeData[]) => {
      dispatch({
        type: 'setLvsSelectNodes',
        value: selectedNodes as unknown as NodeKind[],
      });
    },
    [dispatch]
  );

  const diskTypeValidationError = getDiskTypeValidationError(state, t);

  return (
    <>
      <FormGroup
        label={t('LocalVolumeSet name')}
        isRequired
        fieldId="create-lvs-volume-set-name"
      >
        <TextInput
          type={TextInputTypes.text}
          id="create-lvs-volume-set-name"
          value={state.volumeSetName}
          onChange={(_event, name: string) =>
            dispatch({ type: 'setVolumeSetName', name })
          }
          isRequired
        />
      </FormGroup>
      <FormGroup
        label={t('StorageClass Name')}
        fieldId="create-lvs-storage-class-name"
      >
        <TextInput
          type={TextInputTypes.text}
          id="create-lvs-storage-class-name"
          value={state.storageClassName}
          placeholder={state.volumeSetName}
          onChange={(_event, name: string) =>
            dispatch({ type: 'setStorageClassName', name })
          }
        />
      </FormGroup>
      <Content
        component={ContentVariants.h3}
        className="odf-create-lvs__filter-volumes-text--margin"
      >
        {t('Filter disks by')}
      </Content>
      <FormGroup fieldId="create-lvs-radio-group-node-selector">
        <div id="create-lvs-radio-group-node-selector">
          <Radio
            label={<AllNodesLabel count={state.lvsAllNodes.length} />}
            description={t(
              'Uses the available disks that match the selected filters on all nodes.'
            )}
            name="nodes-selection"
            id="create-lvs-radio-all-nodes"
            className="lso-create-lvs__all-nodes-radio--padding"
            value="allNodes"
            onChange={toggleShowNodesList}
            checked={!state.lvsIsSelectNodes}
          />
          <Radio
            label={t('Disks on selected nodes')}
            name="nodes-selection"
            id="create-lvs-radio-select-nodes"
            value="selectedNodes"
            onChange={toggleShowNodesList}
            description={t(
              'Uses the available disks that match the selected filters only on selected nodes.'
            )}
            checked={state.lvsIsSelectNodes}
          />
        </div>
      </FormGroup>
      {state.lvsIsSelectNodes && (
        <SelectNodesTable
          nodes={createWizardNodeState(
            state.lvsAllNodes as unknown as NodeData[]
          )}
          onRowSelected={onRowSelected}
          systemNamespace={''}
        />
      )}
      <FormGroup label={t('Disk type')} fieldId="create-lvs-disk-type-dropdown">
        <SingleSelectDropdown
          id="create-lvs-disk-type-dropdown"
          className="dropdown--full-width"
          selectOptions={diskTypeDropdownOptions(t)}
          selectedKey={diskTypeDropdownItems(t)[state.diskType]}
          onChange={(type: DiskType) =>
            dispatch({ type: 'setDiskType', value: type })
          }
          valueLabelMap={diskTypeDropdownItems(t)}
        />
        {!!diskTypeValidationError && (
          <Alert
            className="pf-v6-u-mt-md"
            variant={diskTypeValidationError.variant || AlertVariant.danger}
            title={diskTypeValidationError.title}
            isInline
          />
        )}
      </FormGroup>
      <ExpandableSection
        toggleText={t('Advanced')}
        data-test-id="create-lvs-form-advanced"
      >
        <FormGroup
          label={t('Volume mode')}
          fieldId="create-odf-disk-mode-dropdown"
          className="odf-create-lvs__disk-mode-dropdown--margin"
        >
          <SingleSelectDropdown
            id="create-odf-disk-mode-dropdown"
            className="dropdown--full-width"
            selectOptions={diskModeDropdownOptions}
            selectedKey={state.diskMode}
            onChange={(mode: string) => {
              dispatch({
                type: 'setDiskMode',
                value: diskModeDropdownItems[mode],
              });
            }}
            valueLabelMap={diskModeDropdownItems}
          />
        </FormGroup>
        <FormGroup
          label={t('Device type')}
          fieldId="create-odf-device-type-dropdown"
          className="odf-create-lvs__device-type-dropdown--margin"
        >
          <MultiSelectDropdown
            id="create-odf-device-type-dropdown"
            selections={state.deviceType}
            selectOptions={deviceTypeDropdownOptions(t)}
            placeholderText={t('Select disk types')}
            onChange={(selectedValues: string[]) => {
              dispatch({ type: 'setDeviceType', value: selectedValues });
            }}
          />
        </FormGroup>
        {state.diskMode === diskModeDropdownItems.FILESYSTEM && (
          <FormGroup
            label={t('File System Type')}
            fieldId="create-lso-fs-type-dropdown"
            className="lso-create-lvs__fs-type-dropdown--margin"
          >
            <SingleSelectDropdown
              id="create-lso-fs-type-dropdown"
              className="dropdown--full-width"
              selectOptions={fsTypeDropdownOptions}
              selectedKey={state.fsType}
              onChange={(mode: string) => {
                dispatch({
                  type: 'setFsType',
                  value: fsTypeDropdownItems[mode],
                });
              }}
              valueLabelMap={fsTypeDropdownItems}
            />
          </FormGroup>
        )}
        <FormGroup
          label={t('Disk size')}
          fieldId="create-lvs-disk-size"
          className="odf-create-lvs__disk-size-form-group--margin"
        >
          <div
            id="create-lvs-disk-size"
            className="odf-create-lvs__disk-size-form-group-div"
          >
            <FormGroup
              label={t('Minimum')}
              fieldId="create-lvs-min-disk-size"
              className="odf-create-lvs__disk-size-form-group-max-min-input"
            >
              <Tooltip
                content={
                  !validMinDiskSize
                    ? diskSizeHelpText
                    : t(
                        'Please enter a value less than or equal to max disk size'
                      )
                }
                isVisible={
                  !validMinDiskSize ||
                  (invalidMinGreaterThanMax && activeMinDiskSize)
                }
                trigger="manual"
              >
                <TextInput
                  type={TextInputTypes.text}
                  id="create-lvs-min-disk-size"
                  value={state.minDiskSize}
                  validated={
                    !validMinDiskSize ||
                    (invalidMinGreaterThanMax && activeMinDiskSize)
                      ? 'error'
                      : 'default'
                  }
                  className="odf-create-lvs__disk-input"
                  onFocus={() => setMinActiveState(true)}
                  onBlur={() => setMinActiveState(false)}
                  onChange={(_event, size: string) => {
                    dispatch({ type: 'setMinDiskSize', value: size });
                  }}
                />
              </Tooltip>
            </FormGroup>
            <div>-</div>
            <FormGroup
              label={t('Maximum')}
              fieldId="create-lvs-max-disk-size"
              className="odf-create-lvs__disk-size-form-group-max-min-input"
            >
              <Tooltip
                content={
                  !validMaxDiskSize
                    ? diskSizeHelpText
                    : t(
                        'Please enter a value greater than or equal to min disk size'
                      )
                }
                isVisible={
                  !validMaxDiskSize ||
                  (invalidMinGreaterThanMax && activeMaxDiskSize)
                }
                trigger="manual"
              >
                <TextInput
                  type={TextInputTypes.text}
                  id="create-lvs-max-disk-size"
                  value={state.maxDiskSize}
                  validated={
                    !validMaxDiskSize ||
                    (invalidMinGreaterThanMax && activeMaxDiskSize)
                      ? 'error'
                      : 'default'
                  }
                  className="odf-create-lvs__disk-input"
                  onFocus={() => setMaxActiveState(true)}
                  onBlur={() => setMaxActiveState(false)}
                  onChange={(_event, value) =>
                    dispatch({ type: 'setMaxDiskSize', value })
                  }
                />
              </Tooltip>
            </FormGroup>
            <FormGroup
              label={t('Units')}
              fieldId="create-lvs-disk-size-unit-dropdown"
              className="odf-create-lvs__disk-size-form-group-max-min-input"
            >
              <SingleSelectDropdown
                id="create-lvs-disk-size-unit-dropdown"
                selectOptions={diskSizeUnitDropdownOptions}
                selectedKey={STORAGE_SIZE_UNIT_NAME_MAP[state.diskSizeUnit]}
                onChange={(unit: string) => {
                  dispatch({ type: 'setDiskSizeUnit', value: unit });
                }}
                valueLabelMap={diskSizeUnitOptions}
              />
            </FormGroup>
          </div>
        </FormGroup>
        <FormGroup
          label={t('Maximum disks limit')}
          fieldId="create-lvs-max-disk-limit"
        >
          <p className="help-block odf-create-lvs__max-disk-limit-help-text--margin">
            {t(
              'Disks limit will set the maximum number of PVs to create on a node. If the field is empty we will create PVs for all available disks on the matching nodes.'
            )}
          </p>
          <Tooltip
            content={diskSizeHelpText}
            isVisible={!validMaxDiskLimit}
            trigger="manual"
          >
            <TextInput
              type={TextInputTypes.text}
              id="create-lvs-max-disk-limit"
              value={state.maxDiskLimit}
              validated={validMaxDiskLimit ? 'default' : 'error'}
              className="odf-create-lvs__disk-input"
              onChange={(_event, maxLimit) =>
                dispatch({ type: 'setMaxDiskLimit', value: maxLimit })
              }
              placeholder={t('All')}
            />
          </Tooltip>
        </FormGroup>
      </ExpandableSection>
    </>
  );
};

type LocalVolumeSetBodyProps = {
  state: State;
  dispatch: React.Dispatch<Action>;
  storageClassName: string;
};
