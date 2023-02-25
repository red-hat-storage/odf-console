import * as React from 'react';
import { ResourceSummary } from '@odf/shared/details-page/DetailsPage';
import { DeploymentModel } from '@odf/shared/models';
import { DeploymentKind } from '@odf/shared/types';

type DeploymentDetailsProps = {
  resource: DeploymentKind;
};

export const DeploymentDetails: React.FC<DeploymentDetailsProps> = ({
  resource,
}) => {
  return (
    <div className="odf-m-pane__body">
      <ResourceSummary resource={resource} resourceModel={DeploymentModel} />
    </div>
  );
};
