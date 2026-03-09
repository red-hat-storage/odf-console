import * as React from 'react';
import { DISCOVERED_APP_NS, DRApplication } from '@odf/mco/constants';
import { getDRPlacementControlResourceObj } from '@odf/mco/hooks';
import { DRPlacementControlKind } from '@odf/mco/types';
import {
  getName,
  StatusBox,
  useCustomTranslation,
  DRPlacementControlModel,
} from '@odf/shared';
import NameInputWithValidation from '@odf/shared/input-with-requirements/NameInputWithValidation';
import { ResourceIcon } from '@odf/shared/resource-link/resource-link';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction, Trans } from 'react-i18next';
import {
  Alert,
  AlertVariant,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Flex,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Radio,
  Title,
} from '@patternfly/react-core';
import {
  ManagePolicyStateAction,
  ManagePolicyStateType,
  ModalViewContext,
} from '../utils/reducer';
import {
  DRPlacementControlType,
  DRPolicyType,
  VMProtectionType,
} from '../utils/types';
import {
  SharedVMGroupsTable,
  ViewSharedVMGroupTable,
} from './shared-virtual-machine-table';

const RADIO_GROUP_NAME = 'vm_protection_method';

const ProtectionNameInput: React.FC<ProtectionNameInputProps> = ({
  vmProtectionName,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [drpcs, drpcsLoaded, drpcsLoadError] = useK8sWatchResource<
    DRPlacementControlKind[]
  >(
    getDRPlacementControlResourceObj({
      namespace: DISCOVERED_APP_NS,
    })
  );

  const existingProtectionNames = React.useMemo(() => {
    // Ensure drpcs is loaded and valid before processing
    if (!drpcsLoaded || drpcsLoadError) return [];

    return drpcs.map(getName);
  }, [drpcs, drpcsLoaded, drpcsLoadError]);

  const setProtectionName = (newName: string) => {
    dispatch({
      type: ManagePolicyStateType.SET_VM_PROTECTION_NAME,
      context: ModalViewContext.ASSIGN_POLICY_VIEW,
      payload: newName,
    });
  };

  return drpcsLoaded && !drpcsLoadError ? (
    <NameInputWithValidation
      label={t('Protection name')}
      helperText={t('A unique name to identify and manage this protection.')}
      name={vmProtectionName}
      existingNames={existingProtectionNames}
      onChange={setProtectionName}
    />
  ) : (
    <StatusBox loaded={drpcsLoaded} loadError={drpcsLoadError} />
  );
};

const getRadioOptions = (
  isDiscoveredApp: boolean,
  protectionName: string,
  dispatch: React.Dispatch<ManagePolicyStateAction>,
  t: TFunction,
  matchingPolicies: DRPolicyType[],
  sharedVMGroups: DRPlacementControlType[],
  sharedVMGroup: DRPlacementControlType,
  toggleDrawer: (sharedVMGroup: DRPlacementControlType) => void
): RadioOption[] => {
  const options: RadioOption[] = [
    {
      id: 'standalone-vm-protection',
      value: VMProtectionType.STANDALONE,
      description: t(
        'Protect this VM independently without associating it with an existing DR placement control.'
      ),
      label: t('Standalone'),
      isDisabled: false,
      ...(isDiscoveredApp && {
        componentRef: (
          <ProtectionNameInput
            vmProtectionName={protectionName}
            dispatch={dispatch}
          />
        ),
      }),
    },
    {
      id: 'shared-vm-protection',
      value: VMProtectionType.SHARED,
      description: t(
        'Add this VM to an existing DR placement control for consistent failover and recovery. This method is only available for discovered VMs.'
      ),
      label: t('Shared'),
      isDisabled: !isDiscoveredApp || !sharedVMGroups.length,
      ...(isDiscoveredApp && {
        componentRef: (
          <SharedVMGroupsTable
            sharedVMGroup={sharedVMGroup}
            sharedVMGroups={sharedVMGroups}
            matchingPolicies={matchingPolicies}
            toggleDrawer={toggleDrawer}
            dispatch={dispatch}
          />
        ),
      }),
    },
  ];

  return options;
};

const ProtectionTypeSelection: React.FC<ProtectionTypeSelectionProps> = ({
  protectionType,
  protectionName,
  appType,
  dispatch,
  matchingPolicies,
  sharedVMGroups,
  sharedVMGroup,
  toggleDrawer,
}) => {
  const { t } = useCustomTranslation();

  const isDiscoveredApp = appType === DRApplication.DISCOVERED;

  const setProtectionMethod = (event: React.ChangeEvent<HTMLInputElement>) =>
    dispatch({
      type: ManagePolicyStateType.SET_VM_PROTECTION_METHOD,
      context: ModalViewContext.ASSIGN_POLICY_VIEW,
      payload: event.target.value as VMProtectionType,
    });

  const radioOptions = React.useMemo(
    () =>
      getRadioOptions(
        isDiscoveredApp,
        protectionName,
        dispatch,
        t,
        matchingPolicies,
        sharedVMGroups,
        sharedVMGroup,
        toggleDrawer
      ),
    [
      isDiscoveredApp,
      protectionName,
      dispatch,
      t,
      matchingPolicies,
      sharedVMGroups,
      sharedVMGroup,
      toggleDrawer,
    ]
  );

  return (
    <Form>
      <FormGroup label={t('Protection type')} fieldId="vm-protection-method">
        <FormHelperText className="pf-v6-u-mb-sm">
          <HelperText>
            <HelperTextItem variant="indeterminate">
              {t('Choose how you would like to protect this VM:')}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>

        {radioOptions.map(
          ({ id, value, description, label, isDisabled, componentRef }) => (
            <Radio
              key={id}
              id={id}
              name={RADIO_GROUP_NAME}
              value={value}
              description={description}
              label={label}
              onChange={setProtectionMethod}
              isChecked={protectionType === value}
              isDisabled={isDisabled}
              className="pf-v6-u-mb-md"
              body={protectionType === value && componentRef}
            />
          )
        )}

        {!isDiscoveredApp && (
          <Alert
            title={t('Shared protection is not available for managed VMs.')}
            variant={AlertVariant.info}
            isInline
          />
        )}
      </FormGroup>
    </Form>
  );
};

export const ProtectionTypeWizardContent: React.FC<
  ProtectionTypeWizardContentProps
> = ({
  protectionType,
  protectionName,
  appType,
  dispatch,
  matchingPolicies,
  sharedVMGroups,
}) => {
  const { t } = useCustomTranslation();
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [viewSharedVMGroup, setViewSharedGroup] =
    React.useState<DRPlacementControlType>();

  const toggleDrawer = React.useCallback(
    (sharedVMGroup?: DRPlacementControlType) => {
      setViewSharedGroup(sharedVMGroup);
      setIsExpanded((prev) => !prev);
    },
    []
  );

  const onExpand = () => drawerRef.current?.focus();

  const sharedVMGroup = sharedVMGroups?.find(
    (group) => group.vmSharedGroupName === protectionName
  );

  const sharedGroupName = getName(viewSharedVMGroup);

  return (
    <Drawer isExpanded={isExpanded} onExpand={onExpand}>
      <DrawerContent
        panelContent={
          <DrawerPanelContent>
            <Flex>
              <DrawerHead>
                <Title
                  headingLevel="h4"
                  tabIndex={isExpanded ? 0 : -1}
                  ref={drawerRef}
                >
                  {t('Virtual machines ({{count}})', {
                    count: viewSharedVMGroup?.vmSharedGroup?.length,
                  })}
                </Title>
                <DrawerActions>
                  <DrawerCloseButton onClick={() => toggleDrawer()} />
                </DrawerActions>
                <Trans t={t}>
                  <span>
                    Showing all VMs grouped under{' '}
                    <ResourceIcon resourceModel={DRPlacementControlModel} />
                    {{ sharedGroupName }}
                  </span>
                </Trans>
              </DrawerHead>
            </Flex>
            <DrawerPanelBody>
              {viewSharedVMGroup && (
                <ViewSharedVMGroupTable sharedVMGroup={viewSharedVMGroup} />
              )}
            </DrawerPanelBody>
          </DrawerPanelContent>
        }
      >
        <DrawerContentBody>
          <ProtectionTypeSelection
            {...{
              protectionType,
              protectionName,
              appType,
              matchingPolicies,
              sharedVMGroups,
              sharedVMGroup,
              toggleDrawer,
              dispatch,
            }}
          />
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

type ProtectionTypeWizardContentProps = {
  protectionType: VMProtectionType;
  protectionName: string;
  appType: DRApplication;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
  matchingPolicies: DRPolicyType[];
  sharedVMGroups: DRPlacementControlType[];
};

type ProtectionTypeSelectionProps = ProtectionTypeWizardContentProps & {
  sharedVMGroup: DRPlacementControlType;
  toggleDrawer: (sharedVMGroup: DRPlacementControlType) => void;
};

type RadioOption = {
  id: string;
  value: VMProtectionType;
  description: string;
  label: string;
  isDisabled: boolean;
  componentRef?: React.ReactNode;
};

type ProtectionNameInputProps = {
  vmProtectionName: string;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
};

export default ProtectionTypeWizardContent;
