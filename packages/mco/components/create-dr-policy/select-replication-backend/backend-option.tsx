import * as React from 'react';
import { BackendType } from '@odf/mco/constants';
import { t } from 'i18next';
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';

type BackendOptionProps = {
  backendType: BackendType;
  clusterNames?: string[];
  isSelected?: boolean;
  onSelect: (selected: BackendType) => void;
};

export const BackendOptionCard: React.FC<BackendOptionProps> = ({
  backendType,
  clusterNames,
  isSelected,
  onSelect,
}) => {
  const onChange = (_event: React.FormEvent<HTMLInputElement>) => {
    onSelect(backendType);
  };

  const renderSelectedClusters = () => {
    if (!clusterNames || clusterNames.length === 0) {
      return t('No clusters selected');
    }
    return t('Selected Clusters: {{clusters}}', {
      clusters: clusterNames.join(', '),
    });
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
          name: 'single-selectable-storage-backend',
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
