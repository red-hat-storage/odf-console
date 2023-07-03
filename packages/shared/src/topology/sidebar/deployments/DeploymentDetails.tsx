import * as React from 'react';
import { ResourceSummary } from '@odf/shared/details-page/DetailsPage';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { DeploymentModel } from '@odf/shared/models';
import { DeploymentKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';

type DeploymentDetailsProps = {
  resource: DeploymentKind;
};

export const DeploymentDetails: React.FC<DeploymentDetailsProps> = ({
  resource,
}) => {
  const { t } = useCustomTranslation();
  return (
    <div className="odf-m-pane__body">
      <SectionHeading text={t('Deployment details')} />
      <ResourceSummary resource={resource} resourceModel={DeploymentModel} />
    </div>
  );
};
