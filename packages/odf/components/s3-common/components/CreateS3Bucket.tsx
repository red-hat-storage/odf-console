import * as React from 'react';
import { CreateOBC } from '@odf/core/components/mcg/CreateObjectBucketClaim';
import { BucketType } from '@odf/core/constants';
import { CreationMethod } from '@odf/core/types';
import { useCustomTranslation } from '@odf/shared';
import { Tile } from '@patternfly/react-core/deprecated';
import {
  Alert,
  Content,
  ContentVariants,
  FormGroup,
} from '@patternfly/react-core';
import '../../../style.scss';

type CreateS3BucketProps = {
  children?: React.ReactNode;
  title: string;
  description: string;
  showNamespaceSelector?: boolean;
  bucketType?: BucketType;
};

export const CreateS3Bucket: React.FC<CreateS3BucketProps> = ({
  title,
  description,
  showNamespaceSelector = false,
  bucketType = BucketType.General,
  children,
}) => {
  const { t } = useCustomTranslation();
  const [method, setMethod] = React.useState<CreationMethod>(
    CreationMethod.OBC
  );

  return (
    <>
      <div className="odf-create-operand__header">
        <Content className="odf-create-operand__header-text">
          <Content component={ContentVariants.h1}>{title}</Content>
        </Content>
        <p>{description}</p>
      </div>
      <div className="odf-m-pane__body">
        <div className="pf-v6-c-form">
          <FormGroup
            label={t('Select bucket creation method')}
            isRequired
            className="pf-v6-u-mb-md"
          >
            <Tile
              title={t('Create via Object Bucket Claim')}
              isSelected={method === CreationMethod.OBC}
              onClick={() => setMethod(CreationMethod.OBC)}
              className="pf-v6-u-w-50 pf-v6-u-w-33-on-2xl pf-v6-u-mr-md-on-2xl"
            >
              {t(
                'Ideal for Kubernetes environments providing a more abstracted approach to managing storage resources and leveraging dynamic provisioning.'
              )}
            </Tile>
            <Tile
              title={t('Create via S3 API')}
              isSelected={method === CreationMethod.S3}
              onClick={() => setMethod(CreationMethod.S3)}
              className="pf-v6-u-w-50 pf-v6-u-w-33-on-2xl"
            >
              {t(
                'Ideal for applications and systems that need to interact directly with S3-compatible storage.'
              )}
            </Tile>
          </FormGroup>
        </div>
        {method === CreationMethod.OBC && (
          <>
            <Alert
              variant="info"
              isInline
              title={t(
                'OBC references a StorageClass with a provisioner that interacts with the S3 API to create the bucket. Kubernetes then binds the OBC, making the bucket accessible to applications.'
              )}
              className="pf-v6-u-mb-md"
            />
            <CreateOBC
              className="pf-v6-u-w-50"
              showNamespaceSelector={showNamespaceSelector}
              bucketType={bucketType}
            />
          </>
        )}
        {method === CreationMethod.S3 && children}
      </div>
    </>
  );
};
