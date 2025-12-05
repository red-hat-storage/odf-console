import * as React from 'react';
import { projectResource } from '@odf/core/resources';
import { S3ProviderType } from '@odf/core/types';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import { ProjectModel, SecretModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidWatchK8sResourceObj } from '@odf/shared/utils';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  FormGroup,
  Checkbox,
  Button,
  ButtonVariant,
  Bullseye,
  Stack,
  StackItem,
  TextContent,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { LockIcon } from '@patternfly/react-icons';
import { StorageType, SecretRef } from '../types';
import './s3LoginForm.scss';

export type S3LoginFormProps = {
  onLogin: (secretRef: SecretRef, storageType: StorageType) => void;
  logout: () => void;
  providerType?: S3ProviderType;
};

type S3LoginBodyProps = {
  secretRef: SecretRef;
  setSecretRef: React.Dispatch<React.SetStateAction<SecretRef>>;
  storageType: StorageType;
  setStorageType: React.Dispatch<React.SetStateAction<StorageType>>;
};

export const S3LoginBody: React.FC<S3LoginBodyProps> = ({
  secretRef,
  setSecretRef,
  storageType,
  setStorageType,
}) => {
  const { t } = useCustomTranslation();

  const handleChange = (
    _event: React.FormEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    setStorageType(checked ? StorageType.Local : StorageType.Session);
  };

  return (
    <>
      <FormGroup
        label={t('Secret namespace')}
        className="pf-v5-u-my-md"
        isRequired
      >
        <ResourceDropdown<K8sResourceCommon>
          resource={projectResource}
          resourceModel={ProjectModel}
          onSelect={(ns) => {
            setSecretRef((secret) => ({ ...secret, namespace: getName(ns) }));
          }}
          className="odf-s3-secret__dropdown"
        />
      </FormGroup>
      <FormGroup label={t('Secret name')} className="pf-v5-u-my-md" isRequired>
        <ResourceDropdown<K8sResourceCommon>
          resource={getValidWatchK8sResourceObj(
            {
              kind: SecretModel.kind,
              namespace: secretRef.namespace,
              isList: true,
            },
            !!secretRef.namespace
          )}
          resourceModel={SecretModel}
          onSelect={(n) => {
            setSecretRef((secret) => ({ ...secret, name: getName(n) }));
          }}
          className="odf-s3-secret__dropdown"
          isDisabled={!secretRef.namespace}
        />
      </FormGroup>
      <Checkbox
        id="storage-type"
        className="pf-v5-u-my-md"
        label={t('Stay signed in')}
        description={t(
          'If not selected, you need to sign in again when you open a new browser window or a tab.'
        )}
        isChecked={storageType === StorageType.Local}
        onChange={handleChange}
      />
    </>
  );
};

export const S3LoginForm: React.FC<S3LoginFormProps> = ({
  onLogin,
  logout,
}) => {
  const { t } = useCustomTranslation();

  const [secretRef, setSecretRef] = React.useState<SecretRef>({
    name: '',
    namespace: '',
  });
  const [storageType, setStorageType] = React.useState<StorageType>(
    StorageType.Session
  );

  const storeCredentials = () => {
    logout();
    onLogin(secretRef, storageType);
  };

  return (
    <Bullseye className="pf-v5-u-mt-lg">
      <Stack hasGutter>
        <StackItem>
          <TextContent className="pf-v5-u-text-align-center">
            <Text component={TextVariants.h3}>
              <LockIcon className="pf-v5-u-mr-xs" />
              {t('Sign in to continue')}
            </Text>
            <Text component={TextVariants.small}>
              {t(
                'You need permission to access buckets on this cluster. Use Secret namespace and Secret name to continue'
              )}
            </Text>
          </TextContent>
        </StackItem>
        <StackItem>
          <S3LoginBody
            secretRef={secretRef}
            setSecretRef={setSecretRef}
            storageType={storageType}
            setStorageType={setStorageType}
          />
        </StackItem>
        <StackItem className="pf-v5-u-text-align-center">
          <Button
            variant={ButtonVariant.primary}
            onClick={storeCredentials}
            isDisabled={!secretRef.name || !secretRef.namespace}
          >
            {t('Sign in')}
          </Button>
        </StackItem>
      </Stack>
    </Bullseye>
  );
};

export default S3LoginForm;
