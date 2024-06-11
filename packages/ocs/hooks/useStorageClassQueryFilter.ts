import { StorageClassModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { StorageClassResourceKind } from '@odf/shared/types';
import {
  useK8sWatchResource,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { filterCephSCByCluster } from '../utils';

const scResource: WatchK8sResource = {
  kind: StorageClassModel.kind,
  isList: true,
};

export const useStorageClassQueryFilter = (
  clusterNs: string
): [string, boolean, unknown] => {
  const [scData, scDataLoaded, scDataError] =
    useK8sWatchResource<StorageClassResourceKind[]>(scResource);

  let filteredStorageClasses: string[] = [];

  if (!clusterNs) {
    /**
     * This is for ODF Client Mode use case only ("clusterNs" will be "undefined" when this hook will be called from client-console).
     * ODF client mode doesn't deploy ODF StorageCluster hence no "clusterNs", moreover Route for dashboards will be differnt as well.
     * For scenarios where Client & Provider are on same OCP, client-console will be disabled (as per design).
     * Considering all the StorageClasses in the cluster in such case.
     */
    return ['.*', true, null];
  } else {
    filteredStorageClasses = filterCephSCByCluster(scData, clusterNs)?.map(
      getName
    );
  }

  return [filteredStorageClasses.join('|'), scDataLoaded, scDataError];
};
