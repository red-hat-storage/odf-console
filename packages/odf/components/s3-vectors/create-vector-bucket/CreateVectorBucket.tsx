import * as React from 'react';
import { CreateS3Bucket } from '@odf/core/components/s3-common/components/CreateS3Bucket';
import { BucketType } from '@odf/core/constants';
import { useCustomTranslation } from '@odf/shared';
import { S3VectorsProvider } from '../s3-vectors-context';
import CreateVectorBucketForm from './CreateVectorBucketForm';

const CreateVectorBucket: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  return (
    <CreateS3Bucket
      title={t('Create vector bucket')}
      description={t(
        'A vector bucket is a cloud storage container that organizes and manages vector datasets (indexes), allowing users to store, retrieve and control access to data efficiently.'
      )}
      showNamespaceSelector={true}
      bucketType={BucketType.S3Vector}
    >
      <S3VectorsProvider>
        <CreateVectorBucketForm />
      </S3VectorsProvider>
    </CreateS3Bucket>
  );
};

export default CreateVectorBucket;
