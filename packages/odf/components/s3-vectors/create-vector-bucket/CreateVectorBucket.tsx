import * as React from 'react';
import { CreateOBC } from '@odf/core/components/mcg/CreateObjectBucketClaim';
import CreateVectorBucketForm from '@odf/core/components/s3-vectors/create-vector-bucket/CreateVectorBucketForm';
import { useCustomTranslation } from '@odf/shared';
import { Tile } from '@patternfly/react-core/deprecated';
import {
  Alert,
  Content,
  ContentVariants,
  FormGroup,
  TextInput,
} from '@patternfly/react-core';
import '../../../style.scss';
import { S3VectorsProvider } from '../s3-vectors-context';

enum CreationMethod {
  OBC = 'obc',
  S3 = 's3',
}

const CreateVectorBucket: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  const [method, setMethod] = React.useState<CreationMethod>(
    CreationMethod.OBC
  );
  const [subpath, setSubpath] = React.useState('');

  const subpathField = (
    <FormGroup
      label={t('Subpath')}
      fieldId="vector-bucket-subpath"
      className="pf-v6-u-mb-md"
    >
      <TextInput
        id="vector-bucket-subpath"
        type="text"
        value={subpath}
        onChange={(_event, value) => setSubpath(value)}
        className="pf-v6-c-form-control"
        data-test-id="vector-bucket-subpath"
      />
    </FormGroup>
  );

  return (
    <>
      <div className="odf-create-operand__header">
        <Content className="odf-create-operand__header-text">
          <Content component={ContentVariants.h1}>
            {t('Create vector bucket')}
          </Content>
        </Content>
        <p>
          {t(
            'A vector bucket stores vector indexes for semantic search and similar workloads. You can create one with an Object Bucket Claim or directly through the S3 Vectors API.'
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
            <CreateOBC
              className="pf-v6-u-w-50"
              showNamespaceSelector={false}
              formFooter={subpathField}
            />
          </>
        )}
        {method === CreationMethod.S3 && (
          <S3VectorsProvider>
            <CreateVectorBucketForm subpathField={subpathField} />
          </S3VectorsProvider>
        )}
      </div>
    </>
  );
};

export default CreateVectorBucket;
