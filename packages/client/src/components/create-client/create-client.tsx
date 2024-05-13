import * as React from 'react';
import { ButtonBar, useCustomTranslation } from '@odf/shared';
import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Form,
  Button,
  FormGroup,
  TextInput,
  TextArea,
  TextContent,
  Text,
  TextVariants,
  ActionGroup,
  ValidatedOptions,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { StorageClientModel } from '../../models';
import './create-client.scss';
import '../../../style.scss';

const CreateStorageClientHeader: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <div className="odf-create-storage-client__header">
      <TextContent>
        <Text component={TextVariants.h1}>{t('Create StorageClient')}</Text>
        <Text component={TextVariants.small}>
          {t('Create a StorageClient to connect to a Data Foundation system.')}
        </Text>
      </TextContent>
    </div>
  );
};

const validateURL = (userInput: string): ValidatedOptions => {
  if (!userInput) {
    return ValidatedOptions.default;
  }
  try {
    (() => new URL(userInput))();
    const port = userInput.split(':').pop();
    if (port !== '' && _.isInteger(Number(port))) {
      return ValidatedOptions.default;
    } else {
      return ValidatedOptions.error;
    }
  } catch {
    return ValidatedOptions.error;
  }
};

const CreateStorageClient: React.FC = () => {
  const [name, setName] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [ticket, setTicket] = React.useState('');
  const [inProgress, setProgress] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  const { t } = useCustomTranslation();
  const navigate = useNavigate();

  const submit = () => {
    setProgress(true);
    k8sCreate({
      model: StorageClientModel,
      data: {
        metadata: {
          name,
        },
        spec: {
          storageProviderEndpoint: address,
          onboardingTicket: ticket,
        },
      },
    })
      .then(() => {
        setProgress(false);
      })
      .catch((err) => {
        setProgress(false);
        setError(err);
      });
  };

  return (
    <div>
      <CreateStorageClientHeader />
      <div className="odf-m-pane__body">
        <Form className="odf-create-client__form">
          <FormGroup label={t('Name')} fieldId="name" isRequired>
            <TextInput
              id="name"
              value={name}
              onChange={(_e, value) => setName(value)}
            />
          </FormGroup>
          <FormGroup
            label={t('Data Foundation endpoint')}
            fieldId="address"
            isRequired
          >
            <TextInput
              id="address"
              type="url"
              value={address}
              onChange={(_e, value) => setAddress(value)}
              validated={validateURL(address)}
            />
            {validateURL(address) !== ValidatedOptions.default && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant={ValidatedOptions.error}>
                    {t('Please provide a proper URL with a valid port.')}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>
          <FormGroup
            label={t('Onboarding token')}
            fieldId="ticket-data"
            isRequired
          >
            <TextArea
              id="ticket-data"
              value={ticket}
              onChange={(_e, value) => setTicket(value)}
            />
          </FormGroup>
          <ButtonBar inProgress={inProgress} errorMessage={error?.message}>
            <ActionGroup className="pf-v5-c-form">
              <Button onClick={submit}>{t('Create')}</Button>
              <Button variant="secondary" onClick={() => navigate(-1)}>
                {t('Cancel')}
              </Button>
            </ActionGroup>
          </ButtonBar>
        </Form>
      </div>
    </div>
  );
};

export default CreateStorageClient;
