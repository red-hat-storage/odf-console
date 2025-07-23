import * as React from 'react';
import { BackendType } from '@odf/mco/constants';
import { getName } from '@odf/shared';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { ManagedClusterInfoType } from '../utils/reducer';

type BackendOptionProps = {
  backendType: BackendType;
  selectedClusters?: ManagedClusterInfoType[];
  isSelected?: boolean;
  onSelect: (selected: BackendType) => void;
};

export const BackendOptionCard: React.FC<BackendOptionProps> = ({
  backendType,
  selectedClusters,
  isSelected,
  onSelect,
}) => {
  const onChange = (_event: React.FormEvent<HTMLInputElement>) => {
    onSelect(backendType);
  };

  const renderSelectedClusters = () => {
    if (!selectedClusters || selectedClusters.length === 0) {
      return 'No clusters selected';
    }

    const clusterNames = selectedClusters
      .filter((cluster) => cluster)
      .map((cluster) => getName(cluster))
      .filter((name) => name);

    if (clusterNames.length === 0) {
      return 'No clusters selected';
    }

    return `Selected Clusters: ${clusterNames.join(', ')}`;
  };

  return (
    <Card
      id={`selectable-action-${backendType}`}
      isSelectable
      onClick={() => onSelect(backendType)}
      isSelected={isSelected}
    >
      <CardHeader
        selectableActions={{
          selectableActionId: `selectable-action-${backendType}`,
          selectableActionAriaLabelledby: `selectable-action-${backendType}`,
          name: `single-selectable-storage-backend`,
          variant: 'single',
          onChange,
          hasNoOffset: true,
        }}
      >
        <CardTitle>{backendType}</CardTitle>
      </CardHeader>
      <CardFooter>{renderSelectedClusters()}</CardFooter>
    </Card>
  );
};
