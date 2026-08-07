import * as React from 'react';
import { BackendType } from '@odf/mco/constants';
import { useCustomTranslation } from '@odf/shared';
import { TFunction } from 'i18next';
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Label,
} from '@patternfly/react-core';

type BackendOptionProps = {
  backendType: BackendType;
  clusterNames?: string[];
  isSelected?: boolean;
  onSelect: (selected: BackendType) => void;
};

const getBackendOptionDetails = (
  backendType: BackendType,
  t: TFunction
): { title: string; description: string; showRecommended?: boolean } => {
  switch (backendType) {
    case BackendType.DataFoundation:
      return {
        title: t('Data Foundation'),
        description: t('Natively integrated with OpenShift.'),
        showRecommended: true,
      };
    case BackendType.ThirdParty:
    default:
      return {
        title: t('Third-party storage'),
        description: t(
          'For external backends like IBM FlashSystem or IBM Storage Scale.'
        ),
      };
  }
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

  const { t } = useCustomTranslation();
  const { title, description, showRecommended } = getBackendOptionDetails(
    backendType,
    t
  );

  const selectedClustersLabel = () => {
    if (!clusterNames || clusterNames.length === 0) {
      return t('No clusters selected');
    }

    return t('Selected Clusters: {{clusters}}', {
      clusters: clusterNames.join(', '),
    });
  };

  return (
    <Card
      id={`backend-option-${backendType}`}
      isSelectable
      onClick={() => onSelect(backendType)}
      isSelected={isSelected}
    >
      <CardHeader
        selectableActions={{
          selectableActionId: `selectable-action-${backendType}`,
          selectableActionAriaLabelledby: `backend-option-title-${backendType}`,
          name: 'single-selectable-storage-backend',
          variant: 'single',
          onChange,
          hasNoOffset: true,
        }}
      >
        <CardTitle id={`backend-option-title-${backendType}`}>
          {title}
          {showRecommended && (
            <Label className="pf-v6-u-ml-sm" color="blue" isCompact>
              {t('Recommended')}
            </Label>
          )}
        </CardTitle>
      </CardHeader>
      <CardBody>{description}</CardBody>
      <CardFooter>{selectedClustersLabel()}</CardFooter>
    </Card>
  );
};
