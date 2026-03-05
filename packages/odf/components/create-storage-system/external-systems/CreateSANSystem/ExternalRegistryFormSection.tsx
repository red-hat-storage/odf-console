import * as React from 'react';
import { IBM_SCALE_NAMESPACE } from '@odf/core/constants';
import {
  FormGroupController,
  getName,
  ResourceDropdown,
  SecretModel,
  TextInputWithFieldRequirements,
} from '@odf/shared';
import { SecretKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Control, FieldValues } from 'react-hook-form';
import { Grid, GridItem } from '@patternfly/react-core';

type ExternalRegistryFieldRequirements = {
  imageRegistryUrl: string[];
  imageRepositoryName: string[];
};

type ExternalRegistryFormSectionProps = {
  control: Control<FieldValues>;
  fieldRequirements: ExternalRegistryFieldRequirements;
};

export const ExternalRegistryFormSection: React.FC<
  ExternalRegistryFormSectionProps
> = ({ control, fieldRequirements }) => {
  const { t } = useCustomTranslation();

  return (
    <Grid hasGutter>
      <GridItem span={6}>
        <TextInputWithFieldRequirements
          control={control}
          fieldRequirements={fieldRequirements.imageRegistryUrl}
          popoverProps={{
            headerContent: t('Image registry URL requirements'),
            footerContent: `${t('Example')}: quay.io`,
          }}
          formGroupProps={{
            label: t('Image registry URL'),
            fieldId: 'imageRegistryUrl',
            isRequired: true,
          }}
          textInputProps={{
            id: 'imageRegistryUrl',
            name: 'imageRegistryUrl',
            type: 'text',
            'data-test': 'image-registry-url',
          }}
          helperText={t('URL of the image registry.')}
        />
      </GridItem>
      <GridItem span={6}>
        <TextInputWithFieldRequirements
          control={control}
          fieldRequirements={fieldRequirements.imageRepositoryName}
          popoverProps={{
            headerContent: t('Image repository name requirements'),
            footerContent: `${t('Example')}: my-repo`,
          }}
          formGroupProps={{
            label: t('Image repository name'),
            fieldId: 'imageRepositoryName',
            isRequired: true,
          }}
          textInputProps={{
            id: 'imageRepositoryName',
            name: 'imageRepositoryName',
            type: 'text',
            'data-test': 'image-repository-name',
          }}
          helperText={t('Name of the image repository.')}
        />
      </GridItem>
      <GridItem span={12}>
        <FormGroupController
          name="secretKey"
          control={control}
          formGroupProps={{
            label: t('Secret key'),
            fieldId: 'secretKey',
            isRequired: true,
            helperText: t('Select a secret for registry authentication.'),
          }}
          render={({ onChange, onBlur }) => (
            <ResourceDropdown<SecretKind>
              onSelect={(res) => {
                onChange(getName(res));
              }}
              onBlur={onBlur}
              resource={{
                kind: SecretModel.kind,
                namespace: IBM_SCALE_NAMESPACE,
                isList: true,
              }}
              resourceModel={SecretModel}
              data-test="secret-key-dropdown"
            />
          )}
        />
      </GridItem>
      <GridItem span={6}>
        <FormGroupController
          name="caCertificateSecret"
          control={control}
          formGroupProps={{
            label: t('CA certificate secret'),
            fieldId: 'caCertificateSecret',
            isRequired: true,
            helperText: t('Select a secret containing the CA certificate.'),
          }}
          render={({ onChange, onBlur }) => (
            <ResourceDropdown<SecretKind>
              onSelect={(res) => {
                onChange(getName(res));
              }}
              onBlur={onBlur}
              resource={{
                kind: SecretModel.kind,
                namespace: IBM_SCALE_NAMESPACE,
                isList: true,
              }}
              resourceModel={SecretModel}
              data-test="ca-certificate-secret-dropdown"
            />
          )}
        />
      </GridItem>
      <GridItem span={6}>
        <FormGroupController
          name="privateKeySecret"
          control={control}
          formGroupProps={{
            label: t('Private key secret'),
            fieldId: 'privateKeySecret',
            isRequired: true,
            helperText: t('Select a secret containing the private key.'),
          }}
          render={({ onChange, onBlur }) => (
            <ResourceDropdown<SecretKind>
              onSelect={(res) => {
                onChange(getName(res));
              }}
              onBlur={onBlur}
              resource={{
                kind: SecretModel.kind,
                namespace: IBM_SCALE_NAMESPACE,
                isList: true,
              }}
              resourceModel={SecretModel}
              data-test="private-key-secret-dropdown"
            />
          )}
        />
      </GridItem>
    </Grid>
  );
};
