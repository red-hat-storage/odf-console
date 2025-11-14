import * as React from 'react';
import { IAMClientConfig } from '@aws-sdk/client-iam';
import { Link, useNavigate } from 'react-router-dom-v5-compat';
import {
  Form,
  FormGroup,
  TextInput,
  ActionGroup,
  Button,
  Alert,
  FormHelperText,
  FormSection,
  Modal,
  ModalVariant,
  Title,
  Label,
  Flex,
  FlexItem,
  Page,
  PageSection,
  PageSectionVariants,
  PageBreadcrumb,
  Breadcrumb,
  BreadcrumbItem,
  TextContent,
  Text,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  CopyIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  HelpIcon,
} from '@patternfly/react-icons';
import { AddKeyValuePairs, KeyValuePair } from './AddKeyValuePair';
import { createIAMUser, tagUser } from './IAMUserFunctions';
import { useIAMClientConfig } from './IAMUserFunctions';

export const CreateUserForm = () => {
  const userNameRef = React.useRef<HTMLInputElement>(null);
  const descriptiontagRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string>('');
  const [submitted, setSubmitted] = React.useState(false);
  const responseRef = React.useRef<any>(null);
  const config: IAMClientConfig = useIAMClientConfig();
  const [pairs, setPairs] = React.useState<KeyValuePair[]>([
    { Key: '', Value: '' },
  ]);
  const navigate = useNavigate();

  const validateUserName = (value: string): string => {
    const allowedCharsRegex = /^[A-Za-z0-9+=,.@_-]*$/;
    if (!allowedCharsRegex.test(value)) {
      return 'Only A-Z, a-z, 0-9, and + = , . @ _ - are allowed.';
    } else if (!value.trim()) {
      return 'Username cannot be empty.';
    } else if (value.length > 64) {
      return 'Username can have upto 64 characters.';
    }
    return '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = userNameRef.current.value;
    const validationError = validateUserName(name);
    if (validationError) {
      setError(validationError);
    } else {
      const filteredPairs = pairs.filter((pair) => {
        const Key = String(pair.Key || '').trim();
        const Value = String(pair.Value || '').trim();
        return Key !== '' || Value !== ''; // Keep if at least one has content
      });

      responseRef.current = await createIAMUser(name, config, filteredPairs);

      if (descriptiontagRef.current.value.trim() !== '') {
        await tagUser(name, config, {
          //DescriptionTag
          Key: responseRef.current.AccessKey.AccessKeyId,
          Value: descriptiontagRef.current.value,
        });
      }

      setError('');
      //console.log('Submitted value:', name,pairs,descriptiontagRef.current.value);
      setSubmitted(true);
    }
  };

  return (
    <>
      <Page>
        <PageBreadcrumb>
          <Breadcrumb>
            <Link to="IAM">
              {' '}
              <BreadcrumbItem>IAM</BreadcrumbItem>{' '}
            </Link>
            <BreadcrumbItem isActive>Create user</BreadcrumbItem>
          </Breadcrumb>
        </PageBreadcrumb>

        <PageSection variant={PageSectionVariants.light} isFilled>
          <Form onSubmit={handleSubmit} className="pf-v5-u-w-75">
            <TextContent>
              <Title headingLevel="h1">Create user</Title>
              <Text component="p" className="pf-v5-u-color-200">
                Create users to generate and manage accesskeys and policies.
              </Text>
            </TextContent>
            <FormSection>
              <Alert
                variant="info"
                title="Creating user will generate accesskey and secretkey"
                ouiaId="InfoAlert"
              />
              <FormGroup
                label="Username"
                isRequired
                labelIcon={<HelpIcon className="pf-v5-u-color-200" />}
              >
                <TextInput
                  isRequired
                  type="text"
                  ref={userNameRef}
                  placeholder="Input field"
                />
                {error && (
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem
                        icon={<ExclamationCircleIcon />}
                        variant="error"
                      >
                        {error}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                )}
              </FormGroup>

              <AddKeyValuePairs pairs={pairs} setPairs={setPairs} />

              <FormGroup>
                <label className="pf-v5-u-pt-sm">
                  Description tag
                  <div className="pf-v5-u-pt-md">
                    Value{' '}
                    <HelpIcon className="pf-v5-u-color-200 pf-v5-u-ml-sm" />{' '}
                  </div>
                </label>
                <TextInput
                  label="Value"
                  type="text"
                  placeholder="samplevalue12!"
                  ref={descriptiontagRef}
                  className="pf-v5-u-w-50"
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Maximum allowed characters-256. Use combination of
                      letters, numbers, special characters
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>

              <ActionGroup>
                <Button variant="primary" type="submit">
                  Create
                </Button>
                <Button variant="plain" onClick={() => navigate('IAM')}>
                  Cancel
                </Button>
              </ActionGroup>
            </FormSection>
          </Form>
        </PageSection>
      </Page>

      {submitted && (
        <AccessKeySecretKeyDispModal
          isOpen={submitted}
          setIsOpen={setSubmitted}
          navigate={navigate}
          AccessKeyId={responseRef.current.AccessKey.AccessKeyId}
          SecretKey={responseRef.current.AccessKey.SecretAccessKey}
          title="User created"
        />
      )}
    </>
  );
};

export default CreateUserForm;

export type AccessKeySecretKeyDispModalProps = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  navigate?: ReturnType<typeof useNavigate>;
  AccessKeyId: string;
  SecretKey: string;
  title: string;
};

export const AccessKeySecretKeyDispModal: React.FC<
  AccessKeySecretKeyDispModalProps
> = ({ isOpen, setIsOpen, navigate, AccessKeyId, SecretKey, title }) => {
  const [hide, setHide] = React.useState(true);
  const handleCopy = () => {
    navigator.clipboard.writeText(SecretKey);
  };

  const handleDownload = () => {
    const csvContent = `AcesssKey and SecretKey, Value \nAccessKey: ,${AccessKeyId}\nSecretKey: ,${SecretKey}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Accesskey and Secret key information.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        navigate?.('IAM');
      }}
      title={
        <div className="pf-v5-u-display-flex pf-v5-u-justify-content-space-between pf-v5-u-pb-0">
          <Title headingLevel="h2">
            <CheckCircleIcon
              color="var(--pf-v5-global--success-color--100)"
              className="pf-v5-u-mr-sm"
            />
            {title}
          </Title>
          <Button variant="plain" icon={<HelpIcon />} />
        </div>
      }
    >
      <Form>
        <Alert
          variant="warning"
          title="Important : Write down or download secret key as it will be displayed once."
          actionLinks={
            <Button variant="link" onClick={handleDownload}>
              <span style={{ textDecoration: 'underline' }}>
                Download secretkey
              </span>
            </Button>
          }
        />
        <FormSection title="Accesskey information" titleElement="div">
          <FormGroup
            label={
              <>
                Acceskey1{' '}
                <Label
                  className="pf-v5-u-ml-xs"
                  icon={<CheckCircleIcon />}
                  color="green"
                >
                  Active
                </Label>
                <Label className="pf-v5-u-ml-xs" color="cyan">
                  Primary
                </Label>
              </>
            }
          >
            <TextInput readOnly readOnlyVariant="plain" value={AccessKeyId} />
          </FormGroup>

          <FormGroup label="Secretkey">
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

        <ActionGroup>
          <Button
            variant="secondary"
            onClick={() => {
              setIsOpen(false);
              navigate?.('IAM');
            }}
          >
            Done
          </Button>
        </ActionGroup>
      </Form>
    </Modal>
  );
};
