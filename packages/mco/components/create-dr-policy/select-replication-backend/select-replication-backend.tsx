import * as React from 'react';
import { BackendType } from '@odf/mco/constants';
import { Gallery } from '@patternfly/react-core';
import { DRPolicyAction, DRPolicyActionType } from '../utils/reducer';
import { BackendOptionCard } from './backend-option';
import '../create-dr-policy.scss';

type SelectReplicationBackendProps = {
  clusterNames?: string[];
  selectedKey?: BackendType;
  dispatch: React.Dispatch<DRPolicyAction>;
  doClustersHaveODF?: boolean;
};

export const SelectReplicationBackend: React.FC<
  SelectReplicationBackendProps
> = ({ selectedKey, clusterNames, dispatch }) => {
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
        clusterNames={clusterNames}
        isSelected={selectedKey === BackendType.DataFoundation}
        onSelect={handleSelect}
      />
      <BackendOptionCard
        backendType={BackendType.ThirdParty}
        clusterNames={clusterNames}
        isSelected={selectedKey === BackendType.ThirdParty}
        onSelect={handleSelect}
      />
    </Gallery>
  );
};
