import * as React from 'react';
import { WizardNodeState } from '@odf/core/components/create-storage-system/reducer';
import { getTotalCpu, getTotalMemoryInGiB } from '@odf/core/components/utils';
import { McgPerformanceProfile } from '@odf/core/types';
import {
  getMcgProfileDisplayName,
  getMcgProfileRequirements,
  getNodeArchitectureFromState,
  isMcgProfileAllowed,
} from '@odf/core/utils';
import { StorageClusterKind, StorageClusterModel } from '@odf/shared';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { k8sPatch, Patch } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import {
  Content,
  ContentVariants,
  Icon,
  SelectOption,
} from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { InlineResourceRequirementsText } from '../create-storage-system/create-storage-system-steps/capacity-and-nodes-step/inline-resource-requirements-text';
import '@odf/core/components/create-storage-system/create-storage-system-steps/capacity-and-nodes-step/configure-performance.scss';
import {
  ConfigurePerformanceProfileAction,
  ConfigurePerformanceProfileActionType,
  ConfigurePerformanceProfileFormState,
} from './state';
import { clearMcgCustomResources, hasMcgCustomResources } from './utils';

const selectOptions = (
  t: TFunction,
  clusterCpu: number,
  clusterMemoryGiB: number,
  architecture?: string
) =>
  Object.values(McgPerformanceProfile).map((profile) => {
    const { minCpu, minMem } = getMcgProfileRequirements(profile, architecture);
    const description = `CPUs required: ${minCpu}, Memory required: ${minMem} GiB`;
    const isDisabled = !isMcgProfileAllowed(
      profile,
      clusterCpu,
      clusterMemoryGiB,
      architecture
    );
    return (
      <SelectOption
        key={profile}
        value={profile}
        description={description}
        data-test-id={`${profile}-mcg-profile`}
        isDisabled={isDisabled}
      >
        {getMcgProfileDisplayName(profile, t)}
      </SelectOption>
    );
  });

type PatchMcgPerformanceProfileParams = {
  storageCluster: StorageClusterKind;
  mcgPerformanceProfile: McgPerformanceProfile;
};

export const patchMcgPerformanceProfile = async ({
  storageCluster,
  mcgPerformanceProfile,
}: PatchMcgPerformanceProfileParams): Promise<void> => {
  const patches: Patch[] = [];
  const resources = storageCluster.spec?.resources;

  if (hasMcgCustomResources(resources)) {
    patches.push({
      op: 'replace',
      path: '/spec/resources',
      value: clearMcgCustomResources(resources),
    });
  }

  patches.push({
    op: 'replace',
    path: '/spec/multiCloudGateway',
    value: {
      ...storageCluster.spec?.multiCloudGateway,
      performanceProfile: mcgPerformanceProfile,
    },
  });

  await k8sPatch({
    model: StorageClusterModel,
    resource: storageCluster,
    data: patches,
  });
};

type McgPerformanceSectionProps = {
  state: ConfigurePerformanceProfileFormState;
  dispatch: React.Dispatch<ConfigurePerformanceProfileAction>;
  storageCluster: StorageClusterKind;
  clusterNodes: WizardNodeState[];
};

export const McgPerformanceSection: React.FC<McgPerformanceSectionProps> = ({
  state,
  dispatch,
  storageCluster,
  clusterNodes,
}) => {
  const { t } = useCustomTranslation();
  const { mcgPerformanceProfile } = state;
  const clusterCpu = getTotalCpu(clusterNodes);
  const clusterMemoryGiB = getTotalMemoryInGiB(clusterNodes);
  const architecture = getNodeArchitectureFromState(clusterNodes);
  const mcgProfileRequirements = mcgPerformanceProfile
    ? getMcgProfileRequirements(mcgPerformanceProfile, architecture)
    : null;
  const showCustomResourcesInfo = hasMcgCustomResources(
    storageCluster.spec?.resources
  );

  const onProfileChange = React.useCallback(
    (newProfile: McgPerformanceProfile): void => {
      dispatch({
        type: ConfigurePerformanceProfileActionType.SET_MCG_PERFORMANCE_PROFILE,
        payload: newProfile,
      });
    },
    [dispatch]
  );

  return (
    <div className="pf-v6-u-mb-lg">
      <Content component={ContentVariants.h3} className="pf-v6-u-mb-sm">
        {t('Multicloud Object Gateway')}
      </Content>
      <Content
        component={ContentVariants.small}
        id="mcg-performance-desc"
        className="pf-v6-u-mb-xl"
      >
        {t(
          'Optimize Multicloud Object Gateway resource usage for object workload patterns. These settings do not affect Block, File, or RADOS Gateway.'
        )}
      </Content>
      {showCustomResourcesInfo && (
        <Content
          component="p"
          className="configure-performance-profile__custom-resources-info pf-v6-u-mb-xl pf-v6-u-display-flex pf-v6-u-align-items-center"
        >
          <Icon status="info" className="pf-v6-u-mr-sm pf-v6-u-flex-shrink-0">
            <InfoCircleIcon />
          </Icon>
          <strong>
            {t(
              'Custom CPU and memory settings are currently configured for Multicloud Object Gateway. Applying a performance profile will replace these settings.'
            )}
          </strong>
        </Content>
      )}
      <SingleSelectDropdown
        aria-label={t(
          'Select a Multicloud Object Gateway profile from the list'
        )}
        selectedKey={mcgPerformanceProfile ?? undefined}
        id="mcg-performance-profile"
        className="odf-configure-performance__selector pf-v6-u-mb-md"
        selectOptions={selectOptions(
          t,
          clusterCpu,
          clusterMemoryGiB,
          architecture
        )}
        onChange={(profile) =>
          onProfileChange(profile as McgPerformanceProfile)
        }
        placeholderText={t('Select a profile')}
      />
      {mcgProfileRequirements && (
        <InlineResourceRequirementsText
          minCpu={mcgProfileRequirements.minCpu}
          minMem={mcgProfileRequirements.minMem}
          clusterCpu={clusterCpu}
          clusterMemoryGiB={clusterMemoryGiB}
        />
      )}
    </div>
  );
};
