import * as React from 'react';
import { CreateS3Bucket } from '@odf/core/components/s3-common/components/CreateS3Bucket';
import { useCustomTranslation } from '@odf/shared';
import { S3Provider } from '../s3-context';
import CreateBucketForm from './CreateBucketForm';

const CreateBucket: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  return (
    <CreateS3Bucket
      title={t('Create Bucket')}
      description={t(
        'An object bucket is a cloud storage container that organizes and manages files (objects), allowing users to store, retrieve and control access to data efficiently.'
      )}
      showNamespaceSelector={true}
    >
      <S3Provider>
        <CreateBucketForm />
      </S3Provider>
    </CreateS3Bucket>
  );
};

export default CreateBucket;
