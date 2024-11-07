import * as React from 'react';
import { CreateOBC } from '@odf/core/components/mcg/CreateObjectBucketClaim';
import CreateBucketForm from '@odf/core/components/s3-browser/create-bucket/CreateBucketForm';
import { NoobaaS3Provider } from '@odf/core/components/s3-browser/noobaa-context';
import { useCustomTranslation } from '@odf/shared';
import { Alert, FormGroup, Tile } from '@patternfly/react-core';

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
      <div className="co-create-operand__header">
        <h1 className="co-create-operand__header-text">{t('Create Bucket')}</h1>
        <p>
          {t(
            'An object bucket is a cloud storage container that organizes and manages files (objects), allowing users to store, retrieve and control access to data efficiently.'
          )}
        </p>
      </div>
      <div className="co-m-pane__body">
        <div className="pf-v5-c-form">
          <FormGroup
            label={t('Select bucket creation method')}
            isRequired
            className="pf-v5-u-mb-md"
          >
            <Tile
              title={t('Create via Object Bucket Claim')}
              isSelected={method === CreationMethod.OBC}
              onClick={() => setMethod(CreationMethod.OBC)}
              className="pf-v5-u-w-50 pf-v5-u-w-33-on-2xl pf-v5-u-mr-md-on-2xl"
            >
              {t(
                'Ideal for Kubernetes environments providing a more abstracted approach to managing storage resources and leveraging dynamic provisioning.'
              )}
            </Tile>
            <Tile
              title={t('Create via S3 API')}
              isSelected={method === CreationMethod.S3}
              onClick={() => setMethod(CreationMethod.S3)}
              className="pf-v5-u-w-50 pf-v5-u-w-33-on-2xl"
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
                'OBC references a StorageClass that uses a provisioner to interact with the S3 API and create the bucket. Kubernetes binds the OBC to the bucket, making it accessible to applications.'
              )}
              className="pf-v5-u-mb-md"
            />
            <CreateOBC className="pf-v5-u-w-50" showNamespaceSelector={true} />
          </>
        )}
        {method === CreationMethod.S3 && (
          <NoobaaS3Provider>
            <CreateBucketForm />
          </NoobaaS3Provider>
        )}
      </div>
    </>
  );
};

export default CreateBucket;
