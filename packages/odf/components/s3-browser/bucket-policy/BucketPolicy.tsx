import * as React from 'react';
import { S3Context } from '@odf/core/components/s3-browser/s3-context';
import {
  PolicyBody,
  PolicyFooter,
  PolicyHeader,
} from '@odf/core/components/s3-common/bucket-policy';
import { BUCKET_POLICY_CACHE_KEY_SUFFIX } from '@odf/core/constants';
import DeleteBucketPolicyModal from '@odf/core/modals/s3-common/bucket-policy/DeleteBucketPolicy';
import SaveBucketPolicyModal from '@odf/core/modals/s3-common/bucket-policy/SaveBucketPolicy';
import { useModalWrapper } from '@odf/shared';
import { StatusBox, LoadingBox } from '@odf/shared/generic/status-box';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useParams } from 'react-router-dom-v5-compat';
import useSWRMutation from 'swr/mutation';
import { PreConfiguredPolicies } from './PreConfiguredPolicies';

type BucketPolicyProps = {
  obj: { fresh: boolean; triggerRefresh: () => void };
};

type BucketPolicyContentProps = {
  triggerRefresh: () => void;
  success: boolean;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
};

type DeleteBucketPolicyModalProps = {
  triggerRefresh: () => void;
  deletePolicy: () => Promise<void>;
  title: string;
};

type SaveBucketPolicyModalProps = {
  triggerRefresh: () => void;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  savePolicy: () => Promise<void>;
};

const BUCKET_POLICY_SCHEMA_URI = 'https://s3.com/s3-bucket-policy-schema.json';

const BucketPolicyContent: React.FC<BucketPolicyContentProps> = ({
  success,
  setSuccess,
  triggerRefresh,
}) => {
  const { t } = useCustomTranslation();
  const [code, setCode] = React.useState('');
  const [edit, setEdit] = React.useState(false);
  const { s3Client } = React.useContext(S3Context);
  const { bucketName } = useParams();
  const launcher = useModalWrapper();

  const launchDeleteModal = () =>
    launcher(DeleteBucketPolicyModal, {
      extraProps: {
        triggerRefresh,
        title: t('Confirm delete bucket policy?'),
        deletePolicy: async () => {
          await s3Client.deleteBucketPolicy({ Bucket: bucketName });
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
          await s3Client.setBucketPolicy({ Bucket: bucketName, Policy: code });
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
    `${s3Client.providerType}-${bucketName}-${BUCKET_POLICY_CACHE_KEY_SUFFIX}`,
    () => s3Client.getBucketPolicy({ Bucket: bucketName })
  );

  const noPolicyExists =
    error?.name === 'NoSuchBucketPolicy' && !policyData?.Policy;

  // initial fetch on first mount or remounts only
  React.useEffect(() => {
    trigger().catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!isLoading && !error && !!policyData?.Policy) {
      const unformattedPolicy = policyData?.Policy;
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
          'Use bucket policy to grant public or restricted access to the objects stored in the bucket.'
        )}
        successAlertTitle={t('Bucket policy applied.')}
        successAlertBody={t(
          'The bucket policy has been successfully created and applied to your S3 bucket.'
        )}
      />
      <PolicyBody
        code={code}
        setCode={setCode}
        edit={edit}
        setEdit={setEdit}
        noPolicyExists={noPolicyExists}
        editTooltip={t(
          'Edit or delete the current bucket policy to customize access permissions or remove the existing configuration.'
        )}
        editButtonLabel={t('Edit bucket policy')}
        emptyStateTitle={t('You do not have an active bucket policy.')}
        schemaUri={BUCKET_POLICY_SCHEMA_URI}
      >
        {edit && <PreConfiguredPolicies setCode={setCode} />}
      </PolicyBody>
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

export const BucketPolicy: React.FC<BucketPolicyProps> = ({
  obj: { fresh, triggerRefresh },
}) => {
  const [success, setSuccess] = React.useState(false);

  return fresh ? (
    <BucketPolicyContent
      triggerRefresh={triggerRefresh}
      success={success}
      setSuccess={setSuccess}
    />
  ) : (
    <LoadingBox />
  );
};
