import * as React from 'react';
import { HOSTNAME_LABEL_KEY as LSO_HOSTNAME_LABEL } from '@odf/core/constants';
import {
  LocalVolumeDiscoveryResultKind,
  DiscoveredDisk,
  DiskMetadata,
} from '@odf/core/types';
import { getAnnotations, getLabel, getName } from '@odf/shared/selectors';
import { getValidWatchK8sResourceObj } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  K8sResourceKind,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { getLvdrResource, createDiscoveredDiskData } from '../../../utils';
import { WizardState } from '../../reducer';

type UseLSOProvisionedVolumes = (
  namespace: string,
  pvAssociatedNodes: WizardState['nodes'],
  provisionedPVs: K8sResourceKind[],
  allowVolumeMapping?: boolean
) => {
  volumesMap: VolumesMap;
  volumesLoaded: boolean;
  volumesError: unknown;
};

type VolumesMap = { [key: string]: DiskMetadata['property'] };

const LSO_DEVICEID_ANNOTATION = 'storage.openshift.com/device-id';

export const useLSOProvisionedVolumes: UseLSOProvisionedVolumes = (
  namespace,
  pvAssociatedNodes,
  provisionedPVs,
  allowVolumeMapping = true
) => {
  // "pvAssociatedNodes" can contain nodes in different order across re-renders, causing "useK8sWatchResource" to destroy/re-establish the connection (thus, unnecessary loading state on the screen)
  const sortedNodes = _.sortBy(pvAssociatedNodes, ['name', 'uid']);
  const [lvdResults, lvdResultsLoaded, lvdResultsError] = useK8sWatchResource<
    LocalVolumeDiscoveryResultKind[]
  >(
    getValidWatchK8sResourceObj(
      getLvdrResource(sortedNodes, namespace),
      allowVolumeMapping
    )
  );

  // Map of local PV to its underlying disk details (SSD/HDD)
  const volumesMap: VolumesMap = React.useMemo(() => {
    if (!allowVolumeMapping) return {};

    // "Available" disks discovered by LocalVolumeDiscoveryResults
    const discoveredDisks: DiscoveredDisk[] =
      createDiscoveredDiskData(lvdResults);

    return (
      provisionedPVs.reduce((acc, pv: K8sResourceKind) => {
        const pvNode = getLabel(pv, LSO_HOSTNAME_LABEL);
        const diskID = getAnnotations(pv)?.[LSO_DEVICEID_ANNOTATION];
        const pvDisk = discoveredDisks.find(
          (disk) =>
            disk.deviceID?.includes(diskID) && disk.node?.includes(pvNode)
        );
        if (!!pvNode && !!diskID && !!pvDisk) {
          acc[getName(pv)] = pvDisk.property;
        }
        return acc;
      }, {} as VolumesMap) || {}
    );
  }, [allowVolumeMapping, lvdResults, provisionedPVs]);

  return {
    volumesMap,
    volumesLoaded: allowVolumeMapping
      ? lvdResultsLoaded && sortedNodes.length === lvdResults?.length
      : true,
    volumesError: allowVolumeMapping ? lvdResultsError : undefined,
  };
};
