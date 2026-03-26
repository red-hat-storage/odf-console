import * as React from 'react';
import { BUCKET_POLICY_CACHE_KEY_SUFFIX } from '@odf/core/constants';
import DeleteVectorBucketPolicyModal from '@odf/core/modals/s3-vectors/vector-bucket-policy/DeleteVectorBucketPolicy';
import SaveVectorBucketPolicyModal from '@odf/core/modals/s3-vectors/vector-bucket-policy/SaveVectorBucketPolicy';
import { S3ProviderType } from '@odf/core/types';
import { StatusBox, LoadingBox } from '@odf/shared/generic/status-box';
import { S3VectorsCommands } from '@odf/shared/s3-vectors';
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
import './vector-bucket-policy.scss';
import { S3VectorsContext } from '../s3-vectors-context';

type VectorBucketPolicyProps = {
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
  s3VectorsClient: S3VectorsCommands;
  vectorBucketName: string;
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
};
// TODO: update as per vector bucket policy
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
        className="pf-v5-u-mt-lg pf-v5-u-mb-xs"
      >
        {t('Bucket policy')}
      </Title>
      <p className="pf-v5-u-mb-lg">
        {t(
          'Use vector bucket policy to grant public or restricted access to the vector indexes stored in the bucket.'
        )}
      </p>
      {success && (
        <Alert
          isInline
          variant={AlertVariant.success}
          title={t('Vector bucket policy applied.')}
          actionClose={
            <AlertActionCloseButton onClose={() => setSuccess(false)} />
          }
          className="pf-v5-u-my-sm"
        >
          <p>
            {t(
              'The vector bucket policy has been successfully created and applied to your S3 Vector bucket.'
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
      // TODO: update schema according to S3 Vector bucket
      schemas: [
        {
          uri: 'https://s3.com/s3-vector-bucket-policy-schema.json', // Unique identifier
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
            'Edit or delete the current vector bucket policy to customize access permissions or remove the existing configuration.'
          )}
        >
          <Button
            variant={ButtonVariant.link}
            onClick={onEdit}
            className="pf-v5-u-my-sm s3-vector-bucket-policy-edit--margin"
          >
            {t('Edit vector bucket policy')}{' '}
            <Icon size="sm">
              <PencilAltIcon color={blueInfoColor.value} />
            </Icon>
          </Button>
        </Tooltip>
      )}
      {/* {edit && <PreConfiguredPolicies setCode={setCode} />} */}
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
        emptyStateTitle={t('You do not have an active vector bucket policy.')}
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
        className="pf-v5-u-mt-sm pf-v5-u-mb-xl"
      />
    </>
  );
};

const PolicyFooter: React.FC<PolicyFooterProps> = ({
  noPolicyExists,
  triggerRefresh,
  s3VectorsClient,
  vectorBucketName,
  code,
  setCode,
  setSuccess,
}) => {
  const { t } = useCustomTranslation();
  const launcher = useModal();

  const launchDeleteModal = () =>
    launcher(DeleteVectorBucketPolicyModal, {
      extraProps: { vectorBucketName, s3VectorsClient, triggerRefresh },
      isOpen: true,
    });
  const launchSaveModal = () =>
    launcher(SaveVectorBucketPolicyModal, {
      extraProps: {
        vectorBucketName,
        s3VectorsClient,
        triggerRefresh,
        policy: code,
        setSuccess,
      },
      isOpen: true,
    });

  return (
    <>
      {noPolicyExists && (
        <span className="pf-v5-u-mt-sm">
          <Button
            variant={ButtonVariant.primary}
            onClick={launchSaveModal}
            className="pf-v5-u-mr-xs"
          >
            {t('Apply policy')}
          </Button>
          <Button
            variant={ButtonVariant.link}
            onClick={() => setCode('')}
            className="pf-v5-u-ml-xs"
          >
            {t('Clear')}
          </Button>
        </span>
      )}
      {!noPolicyExists && (
        <span className="pf-v5-u-mt-sm">
          <Button
            variant={ButtonVariant.secondary}
            onClick={launchSaveModal}
            className="pf-v5-u-mr-xs"
          >
            {t('Save changes')}
          </Button>
          <Button
            variant={ButtonVariant.secondary}
            onClick={launchDeleteModal}
            className="pf-v5-u-mr-xs pf-v5-u-ml-xs"
            isDanger
          >
            {t('Delete')}
          </Button>
          <Button
            variant={ButtonVariant.link}
            onClick={triggerRefresh}
            className="pf-v5-u-ml-xs"
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

  const { s3VectorsClient } = React.useContext(S3VectorsContext);
  const { vectorBucketName } = useParams();
  const providerType = S3ProviderType.Noobaa;
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

  // initial fetch on first mount or remounts only
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
    <div className="pf-v5-u-m-sm">
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
          s3VectorsClient={s3VectorsClient}
          vectorBucketName={vectorBucketName}
          code={code}
          setCode={setCode}
          setSuccess={setSuccess}
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
    <BucketPolicyContent
      triggerRefresh={triggerRefresh}
      success={success}
      setSuccess={setSuccess}
    />
  ) : (
    <LoadingBox />
  );
};
