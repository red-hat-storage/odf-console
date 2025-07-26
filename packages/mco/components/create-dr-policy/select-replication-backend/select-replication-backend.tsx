import * as React from 'react';
import { BackendType } from '@odf/mco/constants';
import { Gallery } from '@patternfly/react-core';
import {
  DRPolicyAction,
  DRPolicyActionType,
  ManagedClusterInfoType,
} from '../utils/reducer';
import { BackendOptionCard } from './backend-option';
import '../create-dr-policy.scss';

type SelectReplicationBackendProps = {
  selectedClusters?: ManagedClusterInfoType[];
  selectedKey?: BackendType;
  dispatch: React.Dispatch<DRPolicyAction>;
};

export const SelectReplicationBackend: React.FC<
  SelectReplicationBackendProps
> = ({ selectedKey, selectedClusters, dispatch }) => {
  const handleSelect = (backend: BackendType) => {
    dispatch({
      type: DRPolicyActionType.SET_REPLICATION_BACKEND,
      payload: backend,
    });
  };

  return (
    <Gallery hasGutter>
      <BackendOptionCard
        backendType={BackendType.DataFoundation}
        selectedClusters={selectedClusters}
        isSelected={selectedKey === BackendType.DataFoundation}
        onSelect={handleSelect}
      />
      <BackendOptionCard
        backendType={BackendType.NonDataFoundation}
        selectedClusters={selectedClusters}
        isSelected={selectedKey === BackendType.NonDataFoundation}
        onSelect={handleSelect}
      />
    </Gallery>
  );
};
