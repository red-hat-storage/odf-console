import * as React from 'react';
import { createWizardNodeState } from '@odf/core/components/utils';
import {
  deviceTypeDropdownItems,
  diskModeDropdownItems,
  diskSizeUnitOptions,
  diskTypeDropdownItems,
  NO_PROVISIONER,
} from '@odf/core/constants';
import { NodeData } from '@odf/core/types';
import {
  fieldRequirementsTranslations,
  formSettings,
  STORAGE_SIZE_UNIT_NAME_MAP,
} from '@odf/shared/constants';
import { MultiSelectDropdown } from '@odf/shared/dropdown/multiselectdropdown';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import { TextInputWithFieldRequirements } from '@odf/shared/input-with-requirements';
import { StorageClassModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { StorageClassResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import validationRegEx from '@odf/shared/utils/validation';
import { useYupValidationResolver } from '@odf/shared/yup-validation-resolver';
import * as _ from 'lodash-es';
import { useForm } from 'react-hook-form';
import { TFunction } from 'react-i18next';
import * as Yup from 'yup';
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
  FormHelperText,
  HelperText,
  HelperTextItem,
  SelectOption,
} from '@patternfly/react-core';
import { getValidatedDeviceTypes } from '../../../../utils';
import { LocalVolumeSet, WizardDispatch, WizardState } from '../../reducer';
import { SelectNodesTable } from '../../select-nodes-table/select-nodes-table';
import '../../../../style.scss';
import './body.scss';

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

const getDiskTypeValidationError = (
  state: WizardState['createLocalVolumeSet'],
  t: TFunction
) => {
  let validationError: {
    title: string;
    description: string;
    variant?: AlertVariant;
  };

  // "chartNodes" signify the nodes (selected by the user) on which disks (SSDs only, other types are disabled) are attached
  // if no such nodes found, it means no SSD is present as well
  if (state.chartNodes.size === 0)
    validationError = {
      title: t('No SSD/NVMe disks detected'),
      description: t(
        'You do not have any SSD/NVMe disks available. Data Foundation supports only SSD/NVMe disk type in internal mode.'
      ),
    };
  else
    validationError = {
      title: t('Disk type is set to SSD/NVMe'),
      description: t(
        'Data Foundation supports only SSD/NVMe disk type for internal mode deployment.'
      ),
      variant: AlertVariant.info,
    };

  return validationError;
};

export const LocalVolumeSetBody: React.FC<LocalVolumeSetBodyProps> = ({
  dispatch,
  state,
  storageClassName,
  nodes,
  allNodes,
  defaultVolumeMode,
  systemNamespace,
}) => {
  const { t } = useCustomTranslation();
  const [radio, setRadio] = React.useState(FilterDiskBy.ALL_NODES);
  const [activeMinDiskSize, setMinActiveState] = React.useState(false);
  const [activeMaxDiskSize, setMaxActiveState] = React.useState(false);

  const formHandler = React.useCallback(
    (
      field: keyof LocalVolumeSet,
      value: LocalVolumeSet[keyof LocalVolumeSet]
    ) =>
      dispatch({
        type: 'wizard/setCreateLocalVolumeSet',
        payload: { field, value },
      }),
    [dispatch]
  );

  // "ErrorHandler" in "CreateLocalVolumeSet" ensures this hook (or FC) renders only after all nodes are loaded
  // It also ensures this FC is un-mounted & mounted again if new nodes are added
  React.useEffect(() => {
    // Updates the nodes with allNodes when the component is rendered
    dispatch({ type: 'wizard/setNodes', payload: allNodes });

    // Updates the pre-selected volume mode
    formHandler('diskMode', defaultVolumeMode);

    // Required to be run only on initial rendering, hence suppressing the eslint rule
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const INTEGER_MAX_REGEX = /^\+?([1-9]\d*)$/;
  const INTEGER_MIN_REGEX = /^\+?([0-9]\d*)$/;

  const validMinDiskSize = INTEGER_MIN_REGEX.test(state.minDiskSize || '1');
  const validMaxDiskSize = INTEGER_MAX_REGEX.test(state.maxDiskSize || '1');
  const validMaxDiskLimit = INTEGER_MAX_REGEX.test(state.maxDiskLimit || '1');

  const invalidMinGreaterThanMax =
    state.minDiskSize !== '' &&
    state.maxDiskSize !== '' &&
    Number(state.minDiskSize) > Number(state.maxDiskSize);

  React.useEffect(() => {
    if (
      !validMinDiskSize ||
      !validMaxDiskSize ||
      !validMaxDiskLimit ||
      invalidMinGreaterThanMax
    ) {
      formHandler('isValidDiskSize', false);
    } else {
      formHandler('isValidDiskSize', true);
    }
  }, [
    formHandler,
    state.minDiskSize,
    state.maxDiskSize,
    state.maxDiskLimit,
    validMinDiskSize,
    validMaxDiskSize,
    validMaxDiskLimit,
    invalidMinGreaterThanMax,
  ]);

  const diskSizeHelpText = t('Please enter a positive Integer');

  const onRowSelected = React.useCallback(
    (selectedNodes: NodeData[]) => {
      const nodesData = createWizardNodeState(selectedNodes);
      dispatch({ type: 'wizard/setNodes', payload: nodesData });
    },
    [dispatch]
  );

  const RADIO_GROUP_NAME = 'filter-by-nodes-radio-group';

  const onRadioSelect = (_unused, event) => {
    const { value } = event.target || { value: '' };
    value === FilterDiskBy.ALL_NODES
      ? dispatch({ type: 'wizard/setNodes', payload: allNodes })
      : dispatch({ type: 'wizard/setNodes', payload: [] });
    setRadio(value);
  };

  const [data, loaded, loadError] =
    useK8sList<StorageClassResourceKind>(StorageClassModel);

  const { schema, fieldRequirements } = React.useMemo(() => {
    const existingNames =
      loaded && !loadError ? data?.map((dataItem) => getName(dataItem)) : [];

    const fieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, 253),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
      fieldRequirementsTranslations.cannotBeUsedBefore(t),
    ];

    const schema = Yup.object({
      'create-lvs-storage-class-name': Yup.string()
        .required()
        .max(253, fieldRequirements[0])
        .matches(
          validationRegEx.startAndEndsWithAlphanumerics,
          fieldRequirements[1]
        )
        .matches(
          validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
          fieldRequirements[2]
        )
        .test(
          'unique-name',
          fieldRequirements[3],
          (value: string) => !existingNames.includes(value)
        ),
    });

    return { schema, fieldRequirements };
  }, [data, loadError, loaded, t]);

  const resolver = useYupValidationResolver(schema);
  const {
    control,
    watch,
    formState: { isValid },
  } = useForm({
    ...formSettings,
    resolver,
  });

  const createLvsStorageClassName: string = watch(
    'create-lvs-storage-class-name'
  );

  React.useEffect(() => {
    dispatch({
      type: 'wizard/setStorageClass',
      payload: {
        name: isValid ? createLvsStorageClassName : '',
        provisioner: NO_PROVISIONER,
      },
    });
  }, [createLvsStorageClassName, dispatch, isValid]);

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
            formHandler('volumeSetName', name)
          }
          isRequired
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {t(
                'A LocalVolumeSet will be created to allow you to filter a set of disks, group them and create a dedicated StorageClass to consume storage from them.'
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements}
        defaultValue={storageClassName}
        popoverProps={{
          headerContent: t('Name requirements'),
          footerContent: `${t('Example')}: my-storage-class`,
        }}
        formGroupProps={{
          label: t('StorageClass name'),
          fieldId: 'create-lvs-storage-class-name',
        }}
        textInputProps={{
          id: 'create-lvs-storage-class-name',
          name: 'create-lvs-storage-class-name',
          type: TextInputTypes.text,
          value: storageClassName,
          placeholder: state.volumeSetName,
          'data-test': 'create-lvs-storage-class-name',
        }}
      />
      <Content
        component={ContentVariants.h3}
        className="odf-create-lvs__filter-volumes-text--margin"
      >
        {t('Filter disks by')}
      </Content>
      <Radio
        label={<AllNodesLabel count={allNodes?.length} />}
        description={t(
          'Uses the available disks that match the selected filters on all nodes.'
        )}
        name={RADIO_GROUP_NAME}
        value={FilterDiskBy.ALL_NODES}
        isChecked={radio === FilterDiskBy.ALL_NODES}
        onChange={(event, _unused) => onRadioSelect(_unused, event)}
        id="create-lvs-radio-all-nodes"
        className="odf-create-lvs__all-nodes-radio--padding"
      />
      <Radio
        label={t('Disks on selected nodes')}
        description={t(
          'Uses the available disks that match the selected filters only on selected nodes.'
        )}
        name={RADIO_GROUP_NAME}
        value={FilterDiskBy.SELECTED_NODES}
        isChecked={radio === FilterDiskBy.SELECTED_NODES}
        onChange={(event, _unused) => onRadioSelect(_unused, event)}
        id="create-lvs-radio-select-nodes"
      />
      {radio === FilterDiskBy.SELECTED_NODES && (
        <SelectNodesTable
          nodes={nodes}
          onRowSelected={onRowSelected}
          systemNamespace={systemNamespace}
        />
      )}
      <FormGroup label={t('Disk type')} fieldId="create-lvs-disk-type-dropdown">
        <SingleSelectDropdown
          id="create-lvs-disk-type-dropdown"
          className="dropdown--full-width"
          selectOptions={diskTypeDropdownOptions(t)}
          selectedKey={diskTypeDropdownItems(t)[state.diskType]}
          onChange={(type: string) => formHandler('diskType', type)}
          valueLabelMap={diskTypeDropdownItems(t)}
          // we only support SSD, disabling dropdown for other options (All/HDD)
          isDisabled
        />
        <Alert
          className="pf-v6-u-mt-md"
          variant={diskTypeValidationError.variant || AlertVariant.danger}
          title={diskTypeValidationError.title}
          isInline
        >
          {diskTypeValidationError.description}
        </Alert>
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
            onChange={(mode: string) => formHandler('diskMode', mode)}
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
            validated={!state.isValidDeviceType ? 'error' : 'default'}
            onChange={(selectedValues: string[]) => {
              const [deviceType, deviceTypeValidation] =
                getValidatedDeviceTypes(selectedValues, state.deviceType);
              formHandler('deviceType', deviceType);
              formHandler('isValidDeviceType', deviceTypeValidation);
            }}
          />
        </FormGroup>
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
                  onChange={(_event, size: string) =>
                    formHandler('minDiskSize', size)
                  }
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
                    formHandler('maxDiskSize', value)
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
                onChange={(unit: string) => formHandler('diskSizeUnit', unit)}
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
                formHandler('maxDiskLimit', maxLimit)
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
  state: WizardState['createLocalVolumeSet'];
  dispatch: WizardDispatch;
  storageClassName: string;
  nodes: WizardState['nodes'];
  allNodes: WizardState['nodes'];
  defaultVolumeMode: WizardState['createLocalVolumeSet']['diskMode'];
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
};
