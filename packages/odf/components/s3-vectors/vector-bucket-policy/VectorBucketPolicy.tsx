import * as React from 'react';
import {
  PolicyBody,
  PolicyFooter,
  PolicyHeader,
} from '@odf/core/components/s3-common/bucket-policy';
import { BUCKET_POLICY_CACHE_KEY_SUFFIX } from '@odf/core/constants';
import DeleteBucketPolicyModal, {
  type DeleteBucketPolicyModalProps,
} from '@odf/core/modals/s3-common/bucket-policy/DeleteBucketPolicy';
import SaveBucketPolicyModal, {
  type SaveBucketPolicyModalProps,
} from '@odf/core/modals/s3-common/bucket-policy/SaveBucketPolicy';
import { S3ProviderType } from '@odf/core/types';
import { StatusBox, LoadingBox } from '@odf/shared/generic/status-box';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { useParams } from 'react-router-dom-v5-compat';
import useSWRMutation from 'swr/mutation';
import { S3VectorsContext } from '../s3-vectors-context';

type VectorBucketPolicyProps = {
  obj: { fresh: boolean; triggerRefresh: () => void };
};

type VectorBucketPolicyContentProps = {
  triggerRefresh: () => void;
  success: boolean;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
};

const VECTOR_BUCKET_POLICY_SCHEMA_URI =
  'https://s3.com/s3-vector-bucket-policy-schema.json';

const VectorBucketPolicyContent: React.FC<VectorBucketPolicyContentProps> = ({
  success,
  setSuccess,
  triggerRefresh,
}) => {
  const { t } = useCustomTranslation();
  const [code, setCode] = React.useState('');
  const [edit, setEdit] = React.useState(false);
  const { s3VectorsClient } = React.useContext(S3VectorsContext);
  const { vectorBucketName } = useParams();
  const providerType = s3VectorsClient.providerType as S3ProviderType;
  const launcher = useModal();

  const launchDeleteModal = () =>
    launcher(DeleteBucketPolicyModal, {
      extraProps: {
        triggerRefresh,
        title: t('Confirm delete vector bucket policy?'),
        deletePolicy: async () => {
          await s3VectorsClient.deleteVectorBucketPolicy({
            vectorBucketName: vectorBucketName,
          });
        },
      } as DeleteBucketPolicyModalProps,
      isOpen: true,
    });

  const launchSaveModal = () =>
    launcher(SaveBucketPolicyModal, {
      extraProps: {
        triggerRefresh,
        setSuccess,
        savePolicy: async () => {
          await s3VectorsClient.setVectorBucketPolicy({
            vectorBucketName: vectorBucketName,
            policy: code,
          });
        },
      } as SaveBucketPolicyModalProps,
      isOpen: true,
    });

  const {
    data: policyData,
    error,
    isMutating: isLoading,
    trigger,
  } = useSWRMutation(
    `${providerType}-${vectorBucketName}-${BUCKET_POLICY_CACHE_KEY_SUFFIX}`,
    () =>
      s3VectorsClient.getVectorBucketPolicy({
        vectorBucketName: vectorBucketName,
      })
  );

  const noPolicyExists =
    error?.name === 'NoSuchBucketPolicy' && !policyData?.policy;

  React.useEffect(() => {
    trigger().catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!isLoading && !error && !!policyData?.policy) {
      const unformattedPolicy = policyData?.policy;
      try {
        const formattedPolicy = JSON.stringify(
          JSON.parse(unformattedPolicy),
          null,
          2
        );
        setCode(formattedPolicy);
      } catch {
        setCode(unformattedPolicy);
      }
    }
  }, [isLoading, error, policyData]);

  if (isLoading || (error && !noPolicyExists)) {
    return <StatusBox loaded={!isLoading} loadError={error} />;
  }

  return (
    <div className="pf-v6-u-m-sm">
      <PolicyHeader
        success={success}
        setSuccess={setSuccess}
        title={t('Bucket policy')}
        description={t(
          'Use vector bucket policy to grant public or restricted access to the vector indexes stored in the bucket.'
        )}
        successAlertTitle={t('Vector bucket policy applied.')}
        successAlertBody={t(
          'The vector bucket policy has been successfully created and applied to your S3 Vector bucket.'
        )}
      />
      <PolicyBody
        code={code}
        setCode={setCode}
        edit={edit}
        setEdit={setEdit}
        noPolicyExists={noPolicyExists}
        editTooltip={t(
          'Edit or delete the current vector bucket policy to customize access permissions or remove the existing configuration.'
        )}
        editButtonLabel={t('Edit vector bucket policy')}
        emptyStateTitle={t('You do not have an active vector bucket policy.')}
        schemaUri={VECTOR_BUCKET_POLICY_SCHEMA_URI}
      />
      {edit && (
        <PolicyFooter
          noPolicyExists={noPolicyExists}
          triggerRefresh={triggerRefresh}
          setCode={setCode}
          launchSaveModal={launchSaveModal}
          launchDeleteModal={launchDeleteModal}
        />
      )}
    </div>
  );
};

export const VectorBucketPolicy: React.FC<VectorBucketPolicyProps> = ({
  obj: { fresh, triggerRefresh },
}) => {
  const [success, setSuccess] = React.useState(false);

  return fresh ? (
    <VectorBucketPolicyContent
      triggerRefresh={triggerRefresh}
      success={success}
      setSuccess={setSuccess}
    />
  ) : (
    <LoadingBox />
  );
};
