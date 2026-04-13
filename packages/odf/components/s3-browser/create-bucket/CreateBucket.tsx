import * as React from 'react';
import { CreateOBC } from '@odf/core/components/mcg/CreateObjectBucketClaim';
import CreateBucketForm from '@odf/core/components/s3-browser/create-bucket/CreateBucketForm';
import { S3Provider } from '@odf/core/components/s3-browser/s3-context';
import { useCustomTranslation } from '@odf/shared';
import { Tile } from '@patternfly/react-core/deprecated';
import {
  Alert,
  FormGroup,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import '../../../style.scss';

enum CreationMethod {
  OBC = 'obc',
  S3 = 's3',
}

const CreateBucket: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [method, setMethod] = React.useState<CreationMethod>(
    CreationMethod.OBC
  );

  return (
    <>
      <div className="odf-create-operand__header">
        <Content className="odf-create-operand__header-text">
          <Content component={ContentVariants.h1}>{t('Create Bucket')}</Content>
        </Content>
        <p>
          {t(
            'An object bucket is a cloud storage container that organizes and manages files (objects), allowing users to store, retrieve and control access to data efficiently.'
          )}
        </p>
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
            <CreateOBC className="pf-v6-u-w-50" showNamespaceSelector={true} />
          </>
        )}
        {method === CreationMethod.S3 && (
          <S3Provider>
            <CreateBucketForm />
          </S3Provider>
        )}
      </div>
    </>
  );
};

export default CreateBucket;
