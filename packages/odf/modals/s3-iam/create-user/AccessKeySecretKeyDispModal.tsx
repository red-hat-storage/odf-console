import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import { CommonModalProps } from '@odf/shared/modals';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Form,
  FormGroup,
  TextInput,
  Button,
  ButtonVariant,
  Alert,
  FormSection,
  Modal,
  ModalVariant,
  Title,
  Label,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@patternfly/react-icons';

export type AccessKeySecretKeyDispModalProps = {
  AccessKeyId: string;
  SecretKey: string;
  title: string;
  buttonText: string;
  navigateTo?: string;
};

export const AccessKeySecretKeyDispModal: React.FC<
  CommonModalProps<AccessKeySecretKeyDispModalProps>
> = ({
  isOpen,
  closeModal,
  extraProps: { AccessKeyId, SecretKey, title, buttonText, navigateTo },
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const [hide, setHide] = React.useState(true);
  const handleCopy = () => {
    navigator.clipboard.writeText(SecretKey);
  };

  const handleDownload = () => {
    const csvContent = `${t('Access key and Secret key')}, ${t('Value')} \n${t('Access key')}: ,${AccessKeyId}\n${t('Secret key')}: ,${SecretKey}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = t('Access key and Secret key information.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    closeModal();
    if (navigateTo) {
      navigate(navigateTo);
    }
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <Title headingLevel="h2">
          <CheckCircleIcon
            color="var(--pf-v5-global--success-color--100)"
            className="pf-v5-u-mr-sm"
          />
          {t(title)}
        </Title>
      }
      actions={[
        <Button
          key="close"
          variant={ButtonVariant.secondary}
          onClick={handleClose}
        >
          {t(buttonText)}
        </Button>,
      ]}
    >
      <Form>
        <Alert
          variant="warning"
          title={t(
            'Important: Download or copy the Secret key as it will be not be displayed again.'
          )}
          actionLinks={
            <Button variant="link" onClick={handleDownload}>
              <span style={{ textDecoration: 'underline' }}>
                {t('Download secret key')}
              </span>
            </Button>
          }
        />
        <FormSection title={t('Access key information')} titleElement="div">
          <FormGroup
            label={
              <>
                {t('Access key ')}
                <Label
                  className="pf-v5-u-ml-xs"
                  icon={<CheckCircleIcon />}
                  color="green"
                >
                  {t('Active')}
                </Label>
                <Label className="pf-v5-u-ml-sm" color="cyan">
                  {t('Primary')}
                </Label>
              </>
            }
          >
            <TextInput readOnly readOnlyVariant="plain" value={AccessKeyId} />
          </FormGroup>
          <FormGroup label={t('Secret key')}>
            <Flex spaceItems={{ default: 'spaceItemsNone' }}>
              <FlexItem>
                <TextInput
                  readOnly
                  readOnlyVariant="plain"
                  value={!hide ? SecretKey : '*'.repeat(SecretKey.length)}
                />
              </FlexItem>
              <FlexItem>
                <Button
                  variant="plain"
                  onClick={() => {
                    setHide(!hide);
                  }}
                >
                  {hide ? <EyeIcon /> : <EyeSlashIcon />}
                </Button>
              </FlexItem>
              <FlexItem>
                <Button variant="plain" onClick={handleCopy}>
                  <CopyIcon />
                </Button>
              </FlexItem>
            </Flex>
          </FormGroup>
        </FormSection>
      </Form>
    </Modal>
  );
};
