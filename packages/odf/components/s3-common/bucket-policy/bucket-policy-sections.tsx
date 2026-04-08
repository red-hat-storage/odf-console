import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
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
import { policySchema } from './policySchema';
import './bucket-policy.scss';

export type PolicyHeaderProps = {
  success: boolean;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  title: string;
  description: string;
  successAlertTitle: string;
  successAlertBody: string;
};

export const PolicyHeader: React.FC<PolicyHeaderProps> = ({
  success,
  setSuccess,
  title,
  description,
  successAlertTitle,
  successAlertBody,
}) => (
  <>
    <Title headingLevel="h2" size="2xl" className="pf-v6-u-mt-lg pf-v6-u-mb-xs">
      {title}
    </Title>
    <p className="pf-v6-u-mb-lg">{description}</p>
    {success && (
      <Alert
        isInline
        variant={AlertVariant.success}
        title={successAlertTitle}
        actionClose={
          <AlertActionCloseButton onClose={() => setSuccess(false)} />
        }
        className="pf-v6-u-my-sm"
      >
        <p>{successAlertBody}</p>
      </Alert>
    )}
  </>
);

export type PolicyBodyProps = {
  edit: boolean;
  setEdit: React.Dispatch<React.SetStateAction<boolean>>;
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  noPolicyExists: boolean;
  editTooltip: string;
  editButtonLabel: string;
  emptyStateTitle: string;
  schemaUri: string;
  children?: React.ReactNode;
};

export const PolicyBody: React.FC<PolicyBodyProps> = ({
  code,
  setCode,
  edit,
  setEdit,
  noPolicyExists,
  editTooltip,
  editButtonLabel,
  emptyStateTitle,
  schemaUri,
  children,
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
          uri: schemaUri,
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
        <Tooltip content={editTooltip}>
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
            {editButtonLabel}{' '}
          </Button>
        </Tooltip>
      )}
      {children}
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
        emptyStateTitle={emptyStateTitle}
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

export type PolicyFooterProps = {
  noPolicyExists: boolean;
  triggerRefresh: () => void;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  launchSaveModal: () => void;
  launchDeleteModal: () => void;
};

export const PolicyFooter: React.FC<PolicyFooterProps> = ({
  noPolicyExists,
  triggerRefresh,
  setCode,
  launchSaveModal,
  launchDeleteModal,
}) => {
  const { t } = useCustomTranslation();

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
