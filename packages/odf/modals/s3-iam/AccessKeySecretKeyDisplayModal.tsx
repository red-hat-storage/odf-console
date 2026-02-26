import * as React from 'react';
import { GreenCheckCircleIcon, useCustomTranslation } from '@odf/shared';
import { CommonModalProps } from '@odf/shared/modals';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Form,
  FormGroup,
  TextInput,
  Button,
  ButtonVariant,
  Alert,
  FormSection,
  Title,
  Label,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { CopyIcon, EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';

export type AccessKeySecretKeyDisplayModalProps = {
  AccessKeyId: string;
  SecretKey: string;
  title: string;
  buttonText: string;
  navigateTo?: string;
};

export const AccessKeySecretKeyDisplayModal: React.FC<
  CommonModalProps<AccessKeySecretKeyDisplayModalProps>
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
          <GreenCheckCircleIcon className="pf-v6-u-mr-sm" />
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
                  className="pf-v6-u-ml-xs"
                  icon={<GreenCheckCircleIcon />}
                  color="green"
                >
                  {t('Active')}
                </Label>
                <Label className="pf-v6-u-ml-sm" color="teal">
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
                  icon={hide ? <EyeIcon /> : <EyeSlashIcon />}
                  variant="plain"
                  onClick={() => {
                    setHide(!hide);
                  }}
                />
              </FlexItem>
              <FlexItem>
                <Button
                  icon={<CopyIcon />}
                  variant="plain"
                  onClick={handleCopy}
                />
              </FlexItem>
            </Flex>
          </FormGroup>
        </FormSection>
      </Form>
    </Modal>
  );
};
