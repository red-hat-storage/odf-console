import * as React from 'react';
import { projectResource } from '@odf/core/resources';
import { S3ProviderType } from '@odf/core/types';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import { ProjectModel, SecretModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidWatchK8sResourceObj } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  k8sGet,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  FormGroup,
  Checkbox,
  Button,
  ButtonVariant,
  Bullseye,
  Stack,
  StackItem,
  Content,
  ContentVariants,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { LockIcon } from '@patternfly/react-icons';
import { StorageType, SecretRef, ClientType } from '../types';
import { hasOBCOwnerRef } from '../utils';
import './loginForm.scss';

export type LoginFormProps = {
  onLogin: (
    secretRef: SecretRef,
    storageType: StorageType,
    hasOBCOwnerRef?: boolean
  ) => void;
  logout: () => void;
  providerType?: S3ProviderType;
  type?: ClientType;
};

type LoginBodyProps = {
  secretRef: SecretRef;
  setSecretRef: React.Dispatch<React.SetStateAction<SecretRef>>;
  storageType: StorageType;
  setStorageType: React.Dispatch<React.SetStateAction<StorageType>>;
};

export const LoginBody: React.FC<LoginBodyProps> = ({
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
        className="pf-v6-u-my-md"
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
      <FormGroup label={t('Secret name')} className="pf-v6-u-my-md" isRequired>
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
        className="pf-v6-u-my-md"
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

export const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  logout,
  type = ClientType.S3,
}) => {
  const { t } = useCustomTranslation();

  const [secretRef, setSecretRef] = React.useState<SecretRef>({
    name: '',
    namespace: '',
  });
  const [storageType, setStorageType] = React.useState<StorageType>(
    StorageType.Session
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const storeCredentials = async () => {
    if (!secretRef.name || !secretRef.namespace) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const secret = await k8sGet({
        model: SecretModel,
        name: secretRef.name,
        ns: secretRef.namespace,
      });

      const obcOwnerRef = hasOBCOwnerRef(secret);

      // Block login from IAM tab if Secret has OBC owner reference
      if (obcOwnerRef && type === ClientType.IAM) {
        setError(
          t(
            'IAM is not supported for ObjectBucketClaim accounts. Please select a different Secret.'
          )
        );
        setIsLoading(false);
        return;
      }

      logout();
      onLogin(secretRef, storageType, obcOwnerRef);
    } catch (err) {
      setError(
        err?.message ||
          t(
            'Failed to fetch Secret. Please check the Secret name and namespace.'
          )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Bullseye className="pf-v6-u-mt-lg">
      <Stack hasGutter>
        <StackItem>
          <Content className="pf-v6-u-text-align-center">
            <Content component={ContentVariants.h3}>
              <LockIcon className="pf-v6-u-mr-xs" />
              {t('Sign in to continue')}
            </Content>
            <Content component={ContentVariants.small}>
              {t(
                'You need permission to access buckets on this cluster. Use Secret namespace and Secret name to continue'
              )}
            </Content>
          </Content>
        </StackItem>
        <StackItem>
          {error && (
            <Alert
              variant={AlertVariant.danger}
              title={error}
              isInline
              className="pf-v6-u-my-md"
            />
          )}
        </StackItem>
        <StackItem>
          <LoginBody
            secretRef={secretRef}
            setSecretRef={setSecretRef}
            storageType={storageType}
            setStorageType={setStorageType}
          />
        </StackItem>
        <StackItem className="pf-v6-u-text-align-center">
          <Button
            variant={ButtonVariant.primary}
            onClick={storeCredentials}
            isDisabled={!secretRef.name || !secretRef.namespace || isLoading}
            isLoading={isLoading}
          >
            {t('Sign in')}
          </Button>
        </StackItem>
      </Stack>
    </Bullseye>
  );
};

export default LoginForm;
