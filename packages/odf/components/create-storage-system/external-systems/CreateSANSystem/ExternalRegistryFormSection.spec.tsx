import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormProvider, useForm } from 'react-hook-form';
import type { Control, FieldValues } from 'react-hook-form';
import { ExternalRegistryFormSection } from './ExternalRegistryFormSection';

jest.mock('@odf/shared', () => {
  const actual = jest.requireActual('@odf/shared');
  return {
    ...actual,
    FormGroupController: ({
      name,
      formGroupProps,
      render: RenderProp,
    }: {
      name: string;
      formGroupProps: { label: string; isRequired?: boolean };
      render: (props: {
        onChange: (v: string) => void;
        onBlur: () => void;
      }) => React.ReactNode;
    }) => (
      <div data-testid={`form-group-${name}`}>
        <label>
          {formGroupProps.label}
          {formGroupProps.isRequired && ' (required)'}
        </label>
        {RenderProp({ onChange: jest.fn(), onBlur: jest.fn() })}
      </div>
    ),
    TextInputWithFieldRequirements: ({
      formGroupProps,
      textInputProps,
    }: {
      formGroupProps: { label: string; fieldId: string; isRequired: boolean };
      textInputProps: { 'data-test': string };
    }) => (
      <div data-testid={textInputProps['data-test']}>
        <label>{formGroupProps.label}</label>
        <input data-testid={`input-${textInputProps['data-test']}`} />
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
    it('should show Image registry URL and Image repository name when showImageRegistryFields is true (OpenShift registry present)', () => {
      render(<FormWrapper showImageRegistryFields={true} />);

      expect(screen.getByText('Image registry URL')).toBeInTheDocument();
      expect(screen.getByText('Image repository name')).toBeInTheDocument();
    });

    it('should hide Image registry URL and Image repository name when showImageRegistryFields is false (OpenShift registry not present)', () => {
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

    it('should show Secret key as required', () => {
      render(<FormWrapper showImageRegistryFields={true} />);

      expect(screen.getByText('Secret key (required)')).toBeInTheDocument();
    });
  });

  describe('Testing combinations', () => {
    it('should show registry fields + optional CA/key when showImageRegistryFields is true', () => {
      render(<FormWrapper showImageRegistryFields={true} />);

      expect(screen.getByText('Image registry URL')).toBeInTheDocument();
      expect(screen.getByText('Image repository name')).toBeInTheDocument();
      expect(screen.getByText('CA certificate secret')).toBeInTheDocument();
      expect(screen.getByText('Private key secret')).toBeInTheDocument();
    });

    it('should show only secret + optional CA/key when showImageRegistryFields is false', () => {
      render(<FormWrapper showImageRegistryFields={false} />);

      expect(screen.queryByText('Image registry URL')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Image repository name')
      ).not.toBeInTheDocument();
      expect(screen.getByText(/Secret key/)).toBeInTheDocument();
      expect(screen.getByText('CA certificate secret')).toBeInTheDocument();
      expect(screen.getByText('Private key secret')).toBeInTheDocument();
    });
  });
});
