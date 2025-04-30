import * as React from 'react';
import { getLastAppDeploymentClusterName } from '@odf/mco/utils';
import { useCustomTranslation } from '@odf/shared';
import { ModalFooter } from '@odf/shared/modals';
import {
  useK8sWatchResources,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Button, ButtonVariant } from '@patternfly/react-core';
import {
  buildMCVResource,
  ConsistencyGroupsContent,
  extractConsistencyGroups,
  getMCVName,
  WatchResourceType,
} from './helper/consistency-groups';
import { ModalViewContext } from './utils/reducer';
import { DRInfoType } from './utils/types';

type VolumeConsistencyGroupViewProps = {
  setModalContext: (context: ModalViewContext) => void;
  drInfo?: DRInfoType;
};

export const VolumeConsistencyGroupView: React.FC<
  VolumeConsistencyGroupViewProps
> = ({ setModalContext, drInfo }) => {
  const { t } = useCustomTranslation();
  const mcvResources = React.useMemo(() => {
    const resources: Record<string, WatchK8sResource> = {};

    if (drInfo?.placementControlInfo) {
      drInfo.placementControlInfo.forEach((placementControl) => {
        const clusterName = getLastAppDeploymentClusterName(placementControl);

        if (clusterName) {
          const mcvName = getMCVName(placementControl);
          resources[mcvName] = buildMCVResource(clusterName, mcvName);
        }
      });
    }

    return resources;
  }, [drInfo]);

  const mcvs = useK8sWatchResources<WatchResourceType>(mcvResources);
  const {
    data: consistencyGroups,
    loaded,
    loadError,
  } = extractConsistencyGroups(mcvs);

  return (
    <>
      <ConsistencyGroupsContent
        consistencyGroups={consistencyGroups}
        loaded={loaded}
        loadError={loadError}
      />
      <ModalFooter>
        <Button
          variant={ButtonVariant.secondary}
          onClick={() => setModalContext(ModalViewContext.MANAGE_POLICY_VIEW)}
        >
          {t('Go back')}
        </Button>
      </ModalFooter>
    </>
  );
};
