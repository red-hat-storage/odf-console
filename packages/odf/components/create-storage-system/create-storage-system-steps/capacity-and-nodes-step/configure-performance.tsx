import * as React from 'react';
import { WizardNodeState } from '@odf/core/components/create-storage-system/reducer';
import {
  createWizardNodeState,
  getTotalCpu,
  getTotalMemoryInGiB,
} from '@odf/core/components/utils';
import {
  resourceProfileTooltip,
  resourceRequirementsTooltip,
} from '@odf/core/constants';
import { useNodesData } from '@odf/core/hooks';
import { ResourceProfile } from '@odf/core/types';
import {
  getNodeArchitectureFromState,
  getResourceProfileRequirements,
  isResourceProfileAllowed,
  nodesWithoutTaints,
} from '@odf/core/utils';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'react-i18next';
import { Content, ContentVariants, SelectOption } from '@patternfly/react-core';
import './configure-performance.scss';

const selectOptions = (
  t: TFunction,
  forceLean: boolean,
  osdAmount: number,
  architecture?: string
) =>
  Object.entries(ResourceProfile).map((value: [string, ResourceProfile]) => {
    const displayName = t('{{mode}} mode', { mode: value[0] });
    let profile = value[1];
    const { minCpu, minMem } = getResourceProfileRequirements(
      profile,
      osdAmount,
      architecture
    );
    const description = `CPUs required: ${minCpu}, Memory required: ${minMem} GiB`;
    const isDisabled =
      forceLean &&
      [ResourceProfile.Balanced, ResourceProfile.Performance].includes(profile);
    return (
      <SelectOption
        key={profile}
        value={profile}
        description={description}
        data-test-id={`${value[0]} mode`}
        isDisabled={isDisabled}
      >
        {displayName}
      </SelectOption>
    );
  });

export const PerformanceHeaderText: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Content id="configure-performance" component={ContentVariants.h4}>
      <span className="pf-v6-u-mr-sm">{t('Configure performance')}</span>
      <FieldLevelHelp>{resourceProfileTooltip(t)}</FieldLevelHelp>
    </Content>
  );
};

type ProfileRequirementsTextProps = {
  selectedProfile: ResourceProfile;
  osdAmount: number;
  architecture?: string;
};

export const ProfileRequirementsText: React.FC<
  ProfileRequirementsTextProps
> = ({ selectedProfile, osdAmount, architecture }) => {
  const { t } = useCustomTranslation();
  const { minCpu, minMem } = getResourceProfileRequirements(
    selectedProfile,
    osdAmount,
    architecture
  );
  return (
    <Content>
      <Content id="resource-requirements" component={ContentVariants.h4}>
        <span className="pf-v6-u-mr-sm">
          {t('Aggregate resource requirements for {{selectedProfile}} mode', {
            selectedProfile,
          })}
        </span>
        {selectedProfile === ResourceProfile.Performance && (
          <FieldLevelHelp>{resourceRequirementsTooltip(t)}</FieldLevelHelp>
        )}
      </Content>
      <Content
        component="p"
        id="cpu-requirements-desc"
        className="pf-v6-u-font-size-sm"
      >
        <div className="pf-v6-u-mb-sm">
          <span className="pf-v6-u-disabled-color-100">
            {t('CPUs required')}:
          </span>{' '}
          <span className="pf-v6-u-font-size-md">
            {minCpu} {t('CPUs')}
          </span>
        </div>
        <div>
          <span className="pf-v6-u-disabled-color-100">
            {t('Memory required')}:
          </span>{' '}
          <span className="pf-v6-u-font-size-md">
            {minMem} {t('GiB')}
          </span>
        </div>
      </Content>
    </Content>
  );
};

type ConfigurePerformanceProps = {
  onResourceProfileChange: (newProfile: ResourceProfile) => void;
  resourceProfile: ResourceProfile;
  headerText?: React.FC;
  profileRequirementsText?: React.FC<ProfileRequirementsTextProps>;
  selectedNodes: WizardNodeState[];
  osdAmount?: number;
};

const ConfigurePerformance: React.FC<ConfigurePerformanceProps> = ({
  onResourceProfileChange,
  resourceProfile,
  headerText: HeaderTextComponent,
  profileRequirementsText: ProfileRequirementsTextComponent,
  selectedNodes,
  osdAmount,
}) => {
  const { t } = useCustomTranslation();
  const [availableNodes, availableNodesLoaded, availableNodesLoadError] =
    useNodesData();

  // Force Lean mode when all selectable capacity is not enough for higher profiles.
  let forceLean = false;
  if (availableNodesLoaded && !availableNodesLoadError) {
    const selectableNodes = createWizardNodeState(
      nodesWithoutTaints(availableNodes)
    );
    const allCpu = getTotalCpu(selectableNodes);
    const allMem = getTotalMemoryInGiB(selectableNodes);
    const architecture = getNodeArchitectureFromState(selectableNodes);
    if (
      !isResourceProfileAllowed(
        ResourceProfile.Balanced,
        allCpu,
        allMem,
        osdAmount,
        architecture
      )
    ) {
      forceLean = true;
    }
  }
  if (forceLean === true && resourceProfile !== ResourceProfile.Lean) {
    onResourceProfileChange(ResourceProfile.Lean);
  }

  // Set error icon in dropdown when appropriate.
  const architecture = getNodeArchitectureFromState(selectedNodes);
  const isProfileAllowed = resourceProfile
    ? isResourceProfileAllowed(
        resourceProfile,
        getTotalCpu(selectedNodes),
        getTotalMemoryInGiB(selectedNodes),
        osdAmount,
        architecture
      )
    : true;
  const validated =
    selectedNodes.length === 0 || isProfileAllowed ? 'default' : 'error';

  return (
    <div className="pf-v6-u-mb-lg">
      <Content className="pf-v6-u-mb-md">
        {HeaderTextComponent && <HeaderTextComponent />}
        <Content
          component="p"
          id="configure-performance-desc"
          className="pf-v6-u-font-size-sm pf-v6-u-disabled-color-100"
        >
          {t(
            'Select a profile to customise the performance of the Data Foundation cluster to meet your requirements.'
          )}
        </Content>
      </Content>
      <SingleSelectDropdown
        aria-label={t('Select a performance mode from the list')}
        selectedKey={resourceProfile}
        id="resource-profile"
        className="odf-configure-performance__selector pf-v6-u-mb-md"
        selectOptions={selectOptions(t, forceLean, osdAmount, architecture)}
        onChange={onResourceProfileChange}
        validated={validated}
      />
      {resourceProfile && ProfileRequirementsTextComponent && (
        <ProfileRequirementsTextComponent
          selectedProfile={resourceProfile}
          osdAmount={osdAmount}
          architecture={architecture}
        />
      )}
    </div>
  );
};

export default ConfigurePerformance;
