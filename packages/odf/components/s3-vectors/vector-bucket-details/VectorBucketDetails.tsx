import * as React from 'react';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { useParams } from 'react-router-dom-v5-compat';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';

const S3VectorBucketDetailsOverview: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { vectorBucketName } = useParams();
  return (
    <div className="odf-m-pane__body">
      <SectionHeading text={t('Bucket overview')} />
      <div className="row">
        <div className="col-sm-6">
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Name')}</DescriptionListTerm>
              <DescriptionListDescription>
                {vectorBucketName}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </div>
      </div>
    </div>
  );
};

type VectorBucketDetailsProps = {
  obj: {
    fresh: boolean;
    resource?: K8sResourceCommon;
  };
};

export const VectorBucketDetails: React.FC<VectorBucketDetailsProps> = ({
  obj: { fresh },
}) => {
  return fresh ? <S3VectorBucketDetailsOverview /> : <LoadingBox />;
};
