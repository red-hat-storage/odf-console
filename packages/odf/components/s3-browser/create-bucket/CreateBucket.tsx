import * as React from 'react';
import { CreateOBC } from '@odf/core/components/mcg/CreateObjectBucketClaim';
import CreateBucketForm from '@odf/core/components/s3-browser/create-bucket/CreateBucketForm';
import { NoobaaS3Provider } from '@odf/core/components/s3-browser/noobaa-context';
import { useCustomTranslation } from '@odf/shared';
import { isClientPlugin } from '@odf/shared/utils';
import {
  Alert,
  FormGroup,
  Tile,
  TextContent,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import '../../../style.scss';

enum CreationMethod {
  OBC = 'obc',
  S3 = 's3',
}

const CreateBucket: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const allowOBCCreation = !isClientPlugin();
  const [method, setMethod] = React.useState<CreationMethod>(
    allowOBCCreation ? CreationMethod.OBC : CreationMethod.S3
  );

  return (
    <>
      <div className="odf-create-operand__header">
        <TextContent className="odf-create-operand__header-text">
          <Text component={TextVariants.h1}>{t('Create Bucket')}</Text>
        </TextContent>
        <p>
          {t(
            'An object bucket is a cloud storage container that organizes and manages files (objects), allowing users to store, retrieve and control access to data efficiently.'
          )}
        </p>
      </div>
      <div className="odf-m-pane__body">
        <div className="pf-v5-c-form">
          <FormGroup
            label={t('Select bucket creation method')}
            isRequired
            className="pf-v5-u-mb-md"
          >
            {allowOBCCreation && (
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
            )}
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
                'OBC references a StorageClass with a provisioner that interacts with the S3 API to create the bucket. Kubernetes then binds the OBC, making the bucket accessible to applications.'
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
