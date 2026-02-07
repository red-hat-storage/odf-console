import * as React from 'react';
import { NO_PROVISIONER } from '@odf/core/constants';
import { useNodesData } from '@odf/core/hooks';
import { StorageClassDropdown } from '@odf/core/modals/add-capacity/add-capacity-modal';
import { PVsAvailableCapacity } from '@odf/core/modals/add-capacity/pvs-available-capacity';
import { pvResource } from '@odf/core/resources';
import { NodeData } from '@odf/core/types';
import { checkArbiterCluster, checkFlexibleScaling } from '@odf/core/utils';
import { getCephNodes } from '@odf/ocs/utils';
import {
  StorageClassResourceKind,
  StorageClusterKind,
  getName,
} from '@odf/shared';
import {
  K8sResourceCommon,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { Checkbox, FormGroup } from '@patternfly/react-core';
import { createWizardNodeState, getDeviceSetReplica } from '../utils';
import {
  AttachStorageAction,
  AttachStorageActionType,
  AttachStorageFormState,
} from './state';

export const LSOStorageClassDropdown = ({
  state,
  dispatch,
  storageCluster,
  namespace,
}: {
  state: AttachStorageFormState;
  dispatch: React.Dispatch<AttachStorageAction>;
  storageCluster: StorageClusterKind;
  namespace: string;
}) => {
  const { t } = useTranslation();
  const [storageClass, setStorageClass] = React.useState(null);
  const [pvData, pvLoaded, pvLoadError] =
    useK8sWatchResource<K8sResourceCommon[]>(pvResource);
  const [nodesData, nodesLoaded, nodesLoadError] = useNodesData();
  const nodesError: boolean =
    nodesLoadError || !(nodesData as []).length || !nodesLoaded;
  const hasFlexibleScaling = checkFlexibleScaling(storageCluster);
  const isArbiterEnabled: boolean = checkArbiterCluster(storageCluster);
  const replica = getDeviceSetReplica(
    isArbiterEnabled,
    hasFlexibleScaling,
    createWizardNodeState(getCephNodes(nodesData, namespace) as NodeData[])
  );

  const storageClassDropdownFilter = React.useCallback(
    (sc: StorageClassResourceKind): StorageClassResourceKind | undefined => {
      return sc.provisioner === NO_PROVISIONER ? sc : undefined;
    },
    []
  );

  const preSelectionFilter = React.useCallback(
    (storageClasses: StorageClassResourceKind[]) => {
      // Filter is required as the resource does not come filtered through the dropdown
      const filteredStorageClasses = storageClasses.filter(
        storageClassDropdownFilter
      );
      return filteredStorageClasses?.[0];
    },
    [storageClassDropdownFilter]
  );

  const onEncryptionChange = React.useCallback(() => {
    dispatch({
      type: AttachStorageActionType.SET_DEVICESET_ENCRYPTION,
      payload: !state.enableEncryptionOnDeviceSet,
    });
  }, [dispatch, state.enableEncryptionOnDeviceSet]);

  return (
    <FormGroup
      className="pf-v6-u-pt-md pf-v6-u-pb-sm"
      id="lso-sc-dropdown__FormGroup"
      fieldId="lso-dropdown"
      label={t('LSO StorageClass')}
      isRequired
    >
      <div id="lso-dropdown" className="lso__sc-dropdown">
        <StorageClassDropdown
          onChange={(sc: StorageClassResourceKind) => {
            setStorageClass(sc);
            dispatch({
              type: AttachStorageActionType.SET_LSO_STORAGECLASS,
              payload: getName(sc),
            });
          }}
          data-test="lso-sc-dropdown"
          initialSelection={preSelectionFilter}
          filter={storageClassDropdownFilter}
        />
        {!nodesError && (
          <PVsAvailableCapacity
            replica={replica}
            data-test-id="lso-attach-storage-pvs-available-capacity"
            storageClass={storageClass}
            data={pvData}
            loaded={pvLoaded}
            loadError={pvLoadError}
          />
        )}

        <Checkbox
          id="enable-encryption-device-set"
          label={t('Enable encryption on device set')}
          className="pf-v6-u-pt-md"
          isChecked={state.enableEncryptionOnDeviceSet}
          onChange={onEncryptionChange}
        />
      </div>
    </FormGroup>
  );
};
