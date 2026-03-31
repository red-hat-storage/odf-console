import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormProvider, useForm } from 'react-hook-form';
import type { Control, FieldValues } from 'react-hook-form';
import { ExternalRegistryFormSection } from './ExternalRegistryFormSection';

jest.mock('@odf/shared', () => {
  const actual = jest.requireActual('@odf/shared');
  const { Controller } = require('react-hook-form');
  return {
    ...actual,
    FormGroupController: ({
      name,
      formGroupProps,
      control,
      render: RenderProp,
    }: {
      name: string;
      formGroupProps: { label: string; isRequired?: boolean };
      control: any;
      render: (props: {
        onChange: (v: string) => void;
        onBlur: () => void;
      }) => any;
    }) => (
      <div data-testid={`form-group-${name}`}>
        <label>
          {formGroupProps.label}
          {formGroupProps.isRequired && ' (required)'}
        </label>
        <Controller
          name={name}
          control={control}
          render={({ field }) =>
            RenderProp({
              onChange: field.onChange,
              onBlur: field.onBlur,
            })
          }
        />
      </div>
    ),
    TextInputWithFieldRequirements: ({
      formGroupProps,
      textInputProps,
      control,
    }: {
      formGroupProps: { label: string; fieldId: string; isRequired: boolean };
      textInputProps: { name: string; 'data-test': string };
      control: any;
    }) => (
      <div data-testid={textInputProps['data-test']}>
        <label>{formGroupProps.label}</label>
        <Controller
          name={textInputProps.name}
          control={control}
          render={({ field }) => (
            <input
              {...field}
              data-testid={`input-${textInputProps['data-test']}`}
            />
          )}
        />
      </div>
    ),
    ResourceDropdown: () => <div data-testid="resource-dropdown" />,
  };
});

jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({ t: (key: string) => key }),
}));

const fieldRequirements = {
  imageRegistryUrl: ['required', 'valid URL'],
  imageRepositoryName: ['required'],
};

const FormWrapper: React.FC<{
  showImageRegistryFields: boolean;
}> = ({ showImageRegistryFields }) => {
  const methods = useForm({
    defaultValues: {
      imageRegistryUrl: '',
      imageRepositoryName: '',
      secretKey: '',
      caCertificateSecret: '',
      privateKeySecret: '',
    },
  });
  return (
    <FormProvider {...methods}>
      <ExternalRegistryFormSection
        control={methods.control as unknown as Control<FieldValues>}
        fieldRequirements={fieldRequirements}
        showImageRegistryFields={showImageRegistryFields}
      />
    </FormProvider>
  );
};

describe('ExternalRegistryFormSection', () => {
  describe('Image registry and repo name visibility', () => {
    it('should not show Image registry URL and Image repository name when showImageRegistryFields is false (external registry, no persistent)', () => {
      render(<FormWrapper showImageRegistryFields={false} />);

      expect(screen.queryByText('Image registry URL')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Image repository name')
      ).not.toBeInTheDocument();
    });

    it('should hide Image registry URL and Image repository name when showImageRegistryFields is false (persistent registry present)', () => {
      render(<FormWrapper showImageRegistryFields={false} />);

      expect(screen.queryByText('Image registry URL')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Image repository name')
      ).not.toBeInTheDocument();
    });
  });

  describe('CA certificate and Private key secret fields', () => {
    it('should always show CA certificate secret and Private key secret fields as optional', () => {
      render(<FormWrapper showImageRegistryFields={false} />);

      expect(screen.getByText('CA certificate secret')).toBeInTheDocument();
      expect(screen.getByText('Private key secret')).toBeInTheDocument();
      expect(
        screen.queryByText('CA certificate secret (required)')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Private key secret (required)')
      ).not.toBeInTheDocument();
    });

    it('should show Secret key as required when showImageRegistryFields is true (part of registry config)', () => {
      render(<FormWrapper showImageRegistryFields={true} />);

      expect(screen.getByText('Secret key (required)')).toBeInTheDocument();
    });

    it('should hide Secret key when showImageRegistryFields is false (no registry fields)', () => {
      render(<FormWrapper showImageRegistryFields={false} />);

      expect(screen.queryByText(/Secret key/)).not.toBeInTheDocument();
    });
  });

  describe('Testing combinations', () => {
    it('should show registry fields + Secret key + optional CA/key when showImageRegistryFields is true', () => {
      render(<FormWrapper showImageRegistryFields={true} />);

      expect(screen.getByText('Image registry URL')).toBeInTheDocument();
      expect(screen.getByText('Image repository name')).toBeInTheDocument();
      expect(screen.getByText(/Secret key/)).toBeInTheDocument();
      expect(screen.getByText('CA certificate secret')).toBeInTheDocument();
      expect(screen.getByText('Private key secret')).toBeInTheDocument();
    });

    it('should show only optional CA/key when showImageRegistryFields is false (no registry or Secret key)', () => {
      render(<FormWrapper showImageRegistryFields={false} />);

      expect(screen.queryByText('Image registry URL')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Image repository name')
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Secret key/)).not.toBeInTheDocument();
      expect(screen.getByText('CA certificate secret')).toBeInTheDocument();
      expect(screen.getByText('Private key secret')).toBeInTheDocument();
    });
  });

  describe('Form payload validation', () => {
    let getValuesRef: any = null;

    const FormWrapperWithPayloadTest: React.FC<{
      showImageRegistryFields: boolean;
      defaultValues?: any;
    }> = ({ showImageRegistryFields, defaultValues }) => {
      const methods = useForm({
        defaultValues: defaultValues || {
          imageRegistryUrl: '',
          imageRepositoryName: '',
          secretKey: '',
          caCertificateSecret: '',
          privateKeySecret: '',
        },
      });

      // Expose getValues for testing
      React.useEffect(() => {
        getValuesRef = methods.getValues;
      });

      return (
        <FormProvider {...methods}>
          <ExternalRegistryFormSection
            control={methods.control as unknown as Control<FieldValues>}
            fieldRequirements={fieldRequirements}
            showImageRegistryFields={showImageRegistryFields}
          />
        </FormProvider>
      );
    };

    it('should have all registry field values when showImageRegistryFields is true and all fields are set', () => {
      render(
        <FormWrapperWithPayloadTest
          showImageRegistryFields={true}
          defaultValues={{
            imageRegistryUrl: 'https://quay.io',
            imageRepositoryName: 'my-repo',
            secretKey: 'my-secret',
            caCertificateSecret: 'ca-cert',
            privateKeySecret: 'private-key',
          }}
        />
      );

      const values = getValuesRef();
      expect(values).toEqual({
        imageRegistryUrl: 'https://quay.io',
        imageRepositoryName: 'my-repo',
        secretKey: 'my-secret',
        caCertificateSecret: 'ca-cert',
        privateKeySecret: 'private-key',
      });
    });

    it('should have empty registry fields when showImageRegistryFields is false', () => {
      render(<FormWrapperWithPayloadTest showImageRegistryFields={false} />);

      const values = getValuesRef();
      expect(values).toEqual({
        imageRegistryUrl: '',
        imageRepositoryName: '',
        secretKey: '',
        caCertificateSecret: '',
        privateKeySecret: '',
      });
    });

    it('should maintain partial field values correctly', () => {
      render(
        <FormWrapperWithPayloadTest
          showImageRegistryFields={true}
          defaultValues={{
            imageRegistryUrl: 'https://quay.io',
            imageRepositoryName: '',
            secretKey: '',
            caCertificateSecret: 'ca-cert',
            privateKeySecret: '',
          }}
        />
      );

      const values = getValuesRef();
      expect(values).toEqual({
        imageRegistryUrl: 'https://quay.io',
        imageRepositoryName: '',
        secretKey: '',
        caCertificateSecret: 'ca-cert',
        privateKeySecret: '',
      });
    });

    it('should preserve form values even when fields are hidden (showImageRegistryFields=false)', () => {
      render(
        <FormWrapperWithPayloadTest
          showImageRegistryFields={false}
          defaultValues={{
            imageRegistryUrl: 'https://prefilled.io',
            imageRepositoryName: 'prefilled-repo',
            secretKey: 'prefilled-secret',
            caCertificateSecret: 'ca-cert',
            privateKeySecret: 'private-key',
          }}
        />
      );

      const values = getValuesRef();
      expect(values).toEqual({
        imageRegistryUrl: 'https://prefilled.io',
        imageRepositoryName: 'prefilled-repo',
        secretKey: 'prefilled-secret',
        caCertificateSecret: 'ca-cert',
        privateKeySecret: 'private-key',
      });
    });

    it('should have empty strings for all fields when no default values provided', () => {
      render(<FormWrapperWithPayloadTest showImageRegistryFields={true} />);

      const values = getValuesRef();
      expect(values).toEqual({
        imageRegistryUrl: '',
        imageRepositoryName: '',
        secretKey: '',
        caCertificateSecret: '',
        privateKeySecret: '',
      });
    });
  });
});
