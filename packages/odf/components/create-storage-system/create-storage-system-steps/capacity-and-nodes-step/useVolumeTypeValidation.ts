import * as React from 'react';
import { LSO_OPERATOR } from '@odf/core/constants';
import { useLSODiskDiscovery } from '@odf/core/hooks';
import {
  VolumeTypeValidation,
  DiskMechanicalProperties,
} from '@odf/core/types';
import { getNamespace } from '@odf/shared';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { isCSVSucceeded } from '@odf/shared/utils';
import { K8sResourceKind } from '@openshift-console/dynamic-plugin-sdk';
import { WizardNodeState, WizardDispatch } from '../../reducer';
import { useLSOProvisionedVolumes } from './useLSOProvisionedVolumes';

type UseVolumeTypeValidation = (
  pvAssociatedNodes: WizardNodeState[],
  provisionedPVs: K8sResourceKind[],
  volumeValidationType: VolumeTypeValidation,
  dispatch: WizardDispatch,
  allowValidation?: boolean
) => void;

export const useVolumeTypeValidation: UseVolumeTypeValidation = (
  pvAssociatedNodes,
  provisionedPVs,
  volumeValidationType,
  dispatch,
  allowValidation = true
) => {
  const [csv, csvLoaded, csvLoadError] = useFetchCsv({
    specName: LSO_OPERATOR,
    startPollingInstantly: allowValidation,
  });
  const lsoNamespace = getNamespace(csv);
  const isLSOInstalled = csvLoaded && !csvLoadError && isCSVSucceeded(csv);

  const [discoveryInProgress, discoveryError] = useLSODiskDiscovery(
    pvAssociatedNodes,
    lsoNamespace,
    isLSOInstalled && allowValidation
  );

  const { volumesMap, volumesLoaded, volumesError } = useLSOProvisionedVolumes(
    lsoNamespace,
    pvAssociatedNodes,
    provisionedPVs,
    allowValidation
  );

  const provisionedPVsLength = provisionedPVs?.length;

  // Block users and show error only when we are absolutely sure. Else, un-block the user with a general disk type info
  React.useEffect(() => {
    if (allowValidation) {
      let validationType: VolumeTypeValidation;
      const volumesMapLength = Object.keys(volumesMap).length;

      // If any LSO related error found: un-block the user with a general disk type info
      if (csvLoadError || discoveryError || volumesError)
        validationType = VolumeTypeValidation.INFO;
      // If any LSO related loading state: block the user without any info/error
      else if (
        !csvLoaded ||
        discoveryInProgress ||
        (isLSOInstalled && !volumesLoaded)
      )
        validationType = VolumeTypeValidation.UNKNOWN;
      // If all volumes are mapped to its underlying disks, if any HDD is found: block the user with error
      else if (
        volumesMapLength === provisionedPVsLength &&
        Object.keys(volumesMap).some(
          (pvName) => volumesMap[pvName] === DiskMechanicalProperties.Rotational
        )
      )
        validationType = VolumeTypeValidation.ERROR;
      // If all volumes are not mapped to its underlying disks (maybe we have both LSO + non-LSO volumes): un-block the user with a general disk type info
      else if (isLSOInstalled && volumesMapLength !== provisionedPVsLength)
        validationType = VolumeTypeValidation.INFO;
      // Default: un-block the user without any info/error
      else validationType = VolumeTypeValidation.NONE;

      if (validationType !== volumeValidationType) {
        dispatch({
          type: 'capacityAndNodes/setVolumeValidationType',
          payload: validationType,
        });
      }
    }
  }, [
    allowValidation,
    csvLoaded,
    csvLoadError,
    discoveryInProgress,
    discoveryError,
    volumesMap,
    volumesLoaded,
    volumesError,
    isLSOInstalled,
    provisionedPVsLength,
    volumeValidationType,
    dispatch,
  ]);
};
