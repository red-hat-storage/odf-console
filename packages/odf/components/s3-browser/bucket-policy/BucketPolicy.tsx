import * as React from 'react';
import { S3Context } from '@odf/core/components/s3-browser/s3-context';
import { BUCKET_POLICY_CACHE_KEY_SUFFIX } from '@odf/core/constants';
import { StatusBox, LoadingBox } from '@odf/shared/generic/status-box';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { useParams } from 'react-router-dom-v5-compat';
import useSWRMutation from 'swr/mutation';
import { CodeEditor, Language } from '@patternfly/react-code-editor';
import {
  Title,
  Alert,
  AlertActionCloseButton,
  AlertVariant,
  Button,
  ButtonVariant,
  Icon,
  Tooltip,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { t_color_blue_40 as blueInfoColor } from '@patternfly/react-tokens';
import DeleteBucketPolicyModal from '../../../modals/s3-browser/bucket-policy/DeleteBucketPolicy';
import SaveBucketPolicyModal from '../../../modals/s3-browser/bucket-policy/SaveBucketPolicy';
import { PreConfiguredPolicies } from './PreConfiguredPolicies';
import './bucket-policy.scss';

type BucketPolicyProps = {
  obj: { fresh: boolean; triggerRefresh: () => void };
};

type PolicyHeaderProps = {
  success: boolean;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
};

type BucketPolicyContentProps = {
  triggerRefresh: () => void;
} & PolicyHeaderProps;

type PolicyBodyProps = {
  edit: boolean;
  setEdit: React.Dispatch<React.SetStateAction<boolean>>;
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  noPolicyExists: boolean;
};

type PolicyFooterProps = {
  noPolicyExists: boolean;
  triggerRefresh: () => void;
  s3Client: S3Commands;
  bucketName: string;
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
};

const policySchema = {
  type: 'object',
  required: ['Version', 'Statement'],
  properties: {
    Version: {
      type: 'string',
      enum: ['2012-10-17'],
    },
    Statement: {
      type: 'array',
      items: {
        type: 'object',
        required: ['Effect', 'Action', 'Resource', 'Principal'],
        properties: {
          Effect: { type: 'string', enum: ['Allow', 'Deny'] },
          Action: { type: ['string', 'array'] },
          Resource: { type: ['string', 'array'] },
          Principal: { type: ['string', 'object'] },
        },
      },
    },
  },
};

const PolicyHeader: React.FC<PolicyHeaderProps> = ({ success, setSuccess }) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <Title
        headingLevel="h2"
        size="2xl"
        className="pf-v6-u-mt-lg pf-v6-u-mb-xs"
      >
        {t('Bucket policy')}
      </Title>
      <p className="pf-v6-u-mb-lg">
        {t(
          'Use bucket policy to grant public or restricted access to the objects stored in the bucket.'
        )}
      </p>
      {success && (
        <Alert
          isInline
          variant={AlertVariant.success}
          title={t('Bucket policy applied.')}
          actionClose={
            <AlertActionCloseButton onClose={() => setSuccess(false)} />
          }
          className="pf-v6-u-my-sm"
        >
          <p>
            {t(
              'The bucket policy has been successfully created and applied to your S3 bucket.'
            )}
          </p>
        </Alert>
      )}
    </>
  );
};

const PolicyBody: React.FC<PolicyBodyProps> = ({
  code,
  setCode,
  edit,
  setEdit,
  noPolicyExists,
}) => {
  const { t } = useCustomTranslation();

  const onEdit = () => {
    setEdit(true);
  };
  const handleEditorDidMount = (_editor, monaco) => {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: 'https://s3.com/s3-bucket-policy-schema.json', // Unique identifier
          fileMatch: ['*'],
          schema: policySchema,
        },
      ],
    });
  };

  const showEdit = !edit && !noPolicyExists;
  const isReadOnly = !edit && !!code;

  return (
    <>
      {showEdit && (
        <Tooltip
          content={t(
            'Edit or delete the current bucket policy to customize access permissions or remove the existing configuration.'
          )}
        >
          <Button
            icon={
              <Icon size="sm">
                <PencilAltIcon color={blueInfoColor.value} />
              </Icon>
            }
            variant={ButtonVariant.link}
            onClick={onEdit}
            className="pf-v6-u-my-sm s3-policy-edit--margin"
          >
            {t('Edit bucket policy')}{' '}
          </Button>
        </Tooltip>
      )}
      {edit && <PreConfiguredPolicies setCode={setCode} />}
      <CodeEditor
        isUploadEnabled={!isReadOnly}
        isLanguageLabelVisible
        height="350px"
        language={Language.json}
        code={code}
        isReadOnly={isReadOnly}
        onCodeChange={(value: string) => {
          setCode(value);
          !edit && onEdit();
        }}
        emptyStateTitle={t('You do not have an active bucket policy.')}
        emptyStateBody={t(
          'Drag a file here, upload files, or start from scratch.'
        )}
        emptyStateButton={t('Browse')}
        emptyStateLink={
          <Button variant={ButtonVariant.link} onClick={onEdit}>
            {t('Start from scratch or use predefined policy configuration')}
          </Button>
        }
        onEditorDidMount={handleEditorDidMount}
        className="pf-v6-u-mt-sm pf-v6-u-mb-xl"
      />
    </>
  );
};

const PolicyFooter: React.FC<PolicyFooterProps> = ({
  noPolicyExists,
  triggerRefresh,
  s3Client,
  bucketName,
  code,
  setCode,
  setSuccess,
}) => {
  const { t } = useCustomTranslation();
  const launcher = useModal();

  const launchDeleteModal = () =>
    launcher(DeleteBucketPolicyModal, {
      extraProps: { bucketName, s3Client, triggerRefresh },
      isOpen: true,
    });
  const launchSaveModal = () =>
    launcher(SaveBucketPolicyModal, {
      extraProps: {
        bucketName,
        s3Client,
        triggerRefresh,
        policy: code,
        setSuccess,
      },
      isOpen: true,
    });

  return (
    <>
      {noPolicyExists && (
        <span className="pf-v6-u-mt-sm">
          <Button
            variant={ButtonVariant.primary}
            onClick={launchSaveModal}
            className="pf-v6-u-mr-xs"
          >
            {t('Apply policy')}
          </Button>
          <Button
            variant={ButtonVariant.link}
            onClick={() => setCode('')}
            className="pf-v6-u-ml-xs"
          >
            {t('Clear')}
          </Button>
        </span>
      )}
      {!noPolicyExists && (
        <span className="pf-v6-u-mt-sm">
          <Button
            variant={ButtonVariant.secondary}
            onClick={launchSaveModal}
            className="pf-v6-u-mr-xs"
          >
            {t('Save changes')}
          </Button>
          <Button
            variant={ButtonVariant.secondary}
            onClick={launchDeleteModal}
            className="pf-v6-u-mr-xs pf-v6-u-ml-xs"
            isDanger
          >
            {t('Delete')}
          </Button>
          <Button
            variant={ButtonVariant.link}
            onClick={triggerRefresh}
            className="pf-v6-u-ml-xs"
          >
            {t('Cancel')}
          </Button>
        </span>
      )}
    </>
  );
};

const BucketPolicyContent: React.FC<BucketPolicyContentProps> = ({
  success,
  setSuccess,
  triggerRefresh,
}) => {
  const [code, setCode] = React.useState('');
  const [edit, setEdit] = React.useState(false);

  const { s3Client } = React.useContext(S3Context);
  const { bucketName } = useParams();
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
      <PolicyHeader success={success} setSuccess={setSuccess} />
      <PolicyBody
        code={code}
        setCode={setCode}
        edit={edit}
        setEdit={setEdit}
        noPolicyExists={noPolicyExists}
      />
      {edit && (
        <PolicyFooter
          noPolicyExists={noPolicyExists}
          triggerRefresh={triggerRefresh}
          s3Client={s3Client}
          bucketName={bucketName}
          code={code}
          setCode={setCode}
          setSuccess={setSuccess}
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
