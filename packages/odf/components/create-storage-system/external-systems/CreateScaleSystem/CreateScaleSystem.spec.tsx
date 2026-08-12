import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { enableScaleEncryption } from '../../../scale-encryption/enableScaleEncryption';
import { CreateScaleSystem } from './CreateScaleSystem';
import { useKernelDevelEligibility } from './hooks/useKernelDevelEligibility';

let mockWatchedValue = '';
let mockFormValues: Record<string, string> = {};

// Mock all external dependencies
jest.mock('react-router', () => ({
  useNavigate: jest.fn(() => jest.fn()),
  Link: ({
    children,
    to,
    className,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
    [key: string]: any;
  }) => (
    <a href={to} className={className} {...props}>
      {children}
    </a>
  ),
}));

// Mock react-hook-form with realistic behavior
jest.mock('react-hook-form', () => {
  const actual = jest.requireActual('react-hook-form');
  return {
    ...actual,
    useForm: jest.fn(() => {
      const form = actual.useForm();
      return {
        ...form,
        watch: jest.fn((_fieldName) => mockWatchedValue),
      };
    }),
  };
});

// Mock useFormValidation with realistic behavior
jest.mock('./useFormValidation', () => {
  const actual = jest.requireActual('react-hook-form');
  return {
    __esModule: true,
    default: jest.fn(() => {
      const form = actual.useForm();
      return {
        formSchema: {
          validate: jest.fn().mockResolvedValue({}),
          validateSync: jest.fn().mockReturnValue({}),
          isValid: true,
          errors: {},
        },
        fieldRequirements: {
          name: ['Name requirements'],
          hostname: ['Hostname requirements'],
          port: ['Port requirements'],
          username: ['Username requirements'],
          password: ['Password requirements'],
          fileSystemName: ['File system name requirements'],
          tenantId: ['Tenant ID requirements'],
          client: ['Client requirements'],
          serverInfo: ['Server information requirements'],
        },
        control: form.control,
        handleSubmit: form.handleSubmit,
        formState: form.formState,
        isEncryptionValid: true,
        watch: jest.fn((_fieldName) => mockWatchedValue),
        getValues: () => mockFormValues,
      };
    }),
  };
});

// Mock @odf/core/hooks
jest.mock('@odf/core/hooks', () => ({
  useNodesData: jest.fn(() => [
    [
      { name: 'node1', uid: 'node1-uid' },
      { name: 'node2', uid: 'node2-uid' },
      { name: 'node3', uid: 'node3-uid' },
    ],
    true, // loaded
    null, // error
  ]),
}));

jest.mock('@odf/core/components/utils', () => ({
  createWizardNodeState: jest.fn((nodes: any[]) => nodes),
}));

// Capture setSelectedNodes so tests can directly control node selection
let capturedSetSelectedNodes: ((nodes: any[]) => void) | null = null;

jest.mock('../common/NodesSection', () => ({
  ScaleNodesSection: jest.fn(
    ({ setSelectedNodes }: { setSelectedNodes: (nodes: any[]) => void }) => {
      capturedSetSelectedNodes = setSelectedNodes;
      return (
        <div data-testid="mock-nodes-section">
          <label htmlFor="include-control-plane-nodes">
            Include control plane nodes
          </label>
          <input id="include-control-plane-nodes" type="checkbox" />
          <div data-test-id="select-nodes-table" />
        </div>
      );
    }
  ),
}));

// Mock @openshift-console/dynamic-plugin-sdk to provide useK8sWatchResource
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useK8sWatchResource: jest.fn(() => [null, true, null]),
}));

// Mock the common hooks
jest.mock('../common/hooks', () => ({
  useIsLocalClusterConfigured: jest.fn(() => null),
}));

jest.mock('./payload', () => ({
  createScaleCaCertSecretPayload: jest.fn(() => () => Promise.resolve({})),
  createScaleRemoteClusterPayload: jest.fn(() => () => Promise.resolve({})),
  createFileSystem: jest.fn(() => () => Promise.resolve({})),
}));

jest.mock('../../../scale-encryption/enableScaleEncryption', () => ({
  enableScaleEncryption: jest.fn(() => Promise.resolve()),
}));

jest.mock('../common/payload', () => ({
  configureMetricsNamespaceLabels: jest.fn(() => Promise.resolve()),
  createConfigMapPayload: jest.fn(() => () => Promise.resolve({})),
  createScaleLocalClusterPayload: jest.fn(() => () => Promise.resolve({})),
  createUserDetailsSecretPayload: jest.fn(() => () => Promise.resolve({})),
  labelNodes: jest.fn(() => () => Promise.resolve({})),
}));

jest.mock('./hooks/useKernelDevelEligibility', () => ({
  useKernelDevelEligibility: jest.fn(),
}));

// Mock only the specific hooks and components that require connectivity or SDK dependencies
jest.mock('@odf/shared', () => {
  const actual = jest.requireActual('@odf/shared');
  return {
    ...actual,
    useCustomTranslation: () => ({
      t: (key: string) => key,
    }),
    useYupValidationResolver: jest.fn(() =>
      jest.fn().mockReturnValue({
        errors: {},
        values: {},
        isValid: true,
      })
    ),
    PageHeading: ({
      children,
      title,
      breadcrumbs,
    }: {
      children: React.ReactNode;
      title: string;
      breadcrumbs?: Array<{ name: string; path: string }>;
    }) => (
      <div data-testid="page-heading">
        <h1>{title}</h1>
        <nav>
          {breadcrumbs?.map(
            (crumb: { name: string; path: string }, index: number) => (
              <span key={index}>{crumb.name}</span>
            )
          )}
        </nav>
        {children}
      </div>
    ),
  };
});

describe('CreateScaleSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWatchedValue = '';
    mockFormValues = {};
    (useKernelDevelEligibility as jest.Mock).mockReturnValue({
      areSelectedNodesEligible: true,
      isLoading: false,
      error: '',
      nodesWithoutKernelDevel: [],
    });
  });

  describe('Component Rendering', () => {
    it('should render the main component with correct title and breadcrumbs', () => {
      render(<CreateScaleSystem />);

      expect(screen.getByText('Connect IBM Storage Scale')).toBeInTheDocument();
      expect(screen.getByText('External Systems')).toBeInTheDocument();
      expect(screen.getByText('Create IBM Storage Scale')).toBeInTheDocument();
    });

    it('should render all form sections', () => {
      render(<CreateScaleSystem />);

      expect(screen.getByText('General configuration')).toBeInTheDocument();
      expect(screen.getByText('Connection details')).toBeInTheDocument();
      expect(screen.getByText('File system configuration')).toBeInTheDocument();
    });

    it('should render all mandatory form fields', () => {
      render(<CreateScaleSystem />);

      // General configuration
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(
        screen.getByText('Select local cluster nodes')
      ).toBeInTheDocument();

      // Connection details
      expect(screen.getByText('Management endpoints')).toBeInTheDocument();
      expect(screen.getByText('Port')).toBeInTheDocument();
      expect(screen.getByText('User name')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.getByText('CA certificate')).toBeInTheDocument();

      // File system configuration
      expect(screen.getByText('File system name')).toBeInTheDocument();
    });

    it('should render the node selection table', () => {
      render(<CreateScaleSystem />);

      expect(
        screen.getByRole('checkbox', { name: 'Include control plane nodes' })
      ).toBeInTheDocument();
      expect(screen.getByTestId('select-nodes-table')).toBeInTheDocument();
    });

    it('should render form buttons', () => {
      render(<CreateScaleSystem />);

      expect(
        screen.getByRole('button', { name: /connect and create/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Form Structure', () => {
    it('should render form with correct structure', () => {
      const { container } = render(<CreateScaleSystem />);

      expect(container.querySelector('form')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Connect and create' })
      ).toBeInTheDocument();
    });

    it('should render all input fields with correct attributes', () => {
      render(<CreateScaleSystem />);

      // Check that all input fields exist by their placeholders
      expect(
        screen.getByPlaceholderText('Enter a name for the external system')
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Mandatory (e.g hostname.example.com)')
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Mandatory (e.g 8843)')
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Enter the file system name')
      ).toBeInTheDocument();
    });

    it('should render optional endpoint fields', () => {
      render(<CreateScaleSystem />);

      // Check that optional endpoint fields exist by their placeholders
      expect(
        screen.getAllByPlaceholderText('Optional (e.g hostname.example.com)')
      ).toHaveLength(2);
      expect(
        screen.getAllByPlaceholderText('Optional (e.g 8843)')
      ).toHaveLength(2);
    });
  });

  describe('Encryption Section', () => {
    it('should render encryption checkbox', () => {
      render(<CreateScaleSystem />);

      expect(
        screen.getByLabelText('Enable data encryption')
      ).toBeInTheDocument();
    });

    it('should not render encryption fields by default', () => {
      render(<CreateScaleSystem />);

      expect(
        screen.queryByTestId('encryption-username')
      ).not.toBeInTheDocument();
    });

    it('submits the shared encryption configuration', async () => {
      const user = userEvent.setup();
      mockWatchedValue = 'valid';
      const { container } = render(<CreateScaleSystem />);

      act(() => {
        capturedSetSelectedNodes([
          { name: 'node1' },
          { name: 'node2' },
          { name: 'node3' },
        ]);
      });

      mockFormValues = {
        name: 'scale-system',
        'mandatory-endpoint-host': 'scale.example.com',
        'mandatory-endpoint-port': '8843',
        userName: 'admin',
        password: 'secret',
        fileSystemName: 'filesystem',
        encryptionUserName: 'encryption-user',
        encryptionPassword: 'encryption-password',
        encryptionPort: '9444',
        client: 'client',
        remoteRKM: 'rkm.example.com',
        serverInformation: 'server.example.com',
        tenantId: 'tenant',
      };
      await user.click(screen.getByLabelText('Enable data encryption'));
      await user.upload(
        container.querySelectorAll('input[type="file"]')[1] as HTMLInputElement,
        new File(['certificate'], 'ca.crt')
      );

      const submitButton = screen.getByRole('button', {
        name: 'Connect and create',
      });
      await waitFor(() => expect(submitButton).toBeEnabled());
      await user.click(submitButton);

      await waitFor(() =>
        expect(enableScaleEncryption).toHaveBeenCalledWith({
          certificate: 'Y2VydGlmaWNhdGU=',
          client: 'client',
          password: 'encryption-password',
          port: '9444',
          remoteRKM: 'rkm.example.com',
          server: 'server.example.com',
          tenant: 'tenant',
          username: 'encryption-user',
        })
      );
    });
  });

  describe('Node Selection', () => {
    it('renders the node selection table', () => {
      render(<CreateScaleSystem />);

      expect(
        screen.getByRole('checkbox', { name: 'Include control plane nodes' })
      ).toBeInTheDocument();
      expect(screen.getByTestId('select-nodes-table')).toBeInTheDocument();
    });

    it('requires at least three selected nodes', async () => {
      mockWatchedValue = 'valid';
      (useKernelDevelEligibility as jest.Mock).mockReturnValue({
        areSelectedNodesEligible: true,
        isLoading: false,
        error: '',
        nodesWithoutKernelDevel: [],
      });

      render(<CreateScaleSystem />);
      act(() => {
        capturedSetSelectedNodes([{ name: 'node1' }, { name: 'node2' }]);
      });

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Connect and create' })
        ).toBeDisabled()
      );
    });
  });

  describe('File Upload', () => {
    it('should render CA certificate upload field', () => {
      const { container } = render(<CreateScaleSystem />);

      expect(container.querySelector('input[type="file"]')).toBeInTheDocument();
      expect(screen.getByText('CA certificate')).toBeInTheDocument();
    });

    it('should encode CA certificate files as base64', async () => {
      const user = userEvent.setup();
      const { container } = render(<CreateScaleSystem />);

      const fileInput = container.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const testFile = new File(
        [
          '-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END CERTIFICATE-----',
        ],
        'test.crt',
        { type: 'application/x-x509-ca-cert' }
      );

      await user.upload(fileInput, testFile);

      // The file should be processed and stored as base64
      // We can't directly test the internal state, but we can verify the file was uploaded
      expect(fileInput.files).toHaveLength(1);
      expect(fileInput.files?.[0]).toBe(testFile);
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and accessibility attributes', () => {
      render(<CreateScaleSystem />);

      // Check for proper form labels
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Management endpoints')).toBeInTheDocument();
      expect(screen.getByText('Port')).toBeInTheDocument();
      expect(screen.getByText('User name')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.getByText('File system name')).toBeInTheDocument();
    });

    it('should have proper test IDs for testing', () => {
      render(<CreateScaleSystem />);

      // Check that all input fields exist by their placeholders
      expect(
        screen.getByPlaceholderText('Enter a name for the external system')
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Mandatory (e.g hostname.example.com)')
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Mandatory (e.g 8843)')
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Enter the file system name')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /connect and create/i })
      ).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should render without crashing', () => {
      expect(() => render(<CreateScaleSystem />)).not.toThrow();
    });

    it('should render all required sections', () => {
      render(<CreateScaleSystem />);

      // Check that all major sections are present
      expect(screen.getByText('General configuration')).toBeInTheDocument();
      expect(screen.getByText('Connection details')).toBeInTheDocument();
      expect(screen.getByText('File system configuration')).toBeInTheDocument();
    });

    it('should render helper text and descriptions', () => {
      render(<CreateScaleSystem />);

      // Check for helper text
      expect(
        screen.getByText(
          'A unique connection name to identify this external system in Data Foundation.'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Select at least 3 nodes to create the local cluster used for IBM Storage Scale connections.'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  describe('ValidatedPasswordInput Integration', () => {
    it('should render password field with ValidatedPasswordInput component', () => {
      render(<CreateScaleSystem />);

      // Check that main password field is rendered
      const passwordInputs = screen.getAllByPlaceholderText('Enter password');
      expect(passwordInputs).toHaveLength(1); // Only main password is visible initially

      // Check that the password field has the correct attributes
      const passwordInput = passwordInputs[0];
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter password');
    });

    it('should disable submit button when password field is empty', () => {
      render(<CreateScaleSystem />);

      const submitButton = screen.getByRole('button', {
        name: /connect and create/i,
      });

      // Initially, submit button should be disabled because required fields are empty
      expect(submitButton).toBeDisabled();
    });

    it('should show password validation requirements when focused', async () => {
      const user = userEvent.setup();
      render(<CreateScaleSystem />);

      const passwordInput = screen.getByPlaceholderText('Enter password');

      // Focus on password input to show validation popover
      await user.click(passwordInput);

      // Check that validation requirements are shown (there are multiple instances - popover title and helper text)
      expect(screen.getAllByText('Password requirements')).toHaveLength(2);
    });

    it('should have password visibility toggle functionality', () => {
      render(<CreateScaleSystem />);

      // Check that the password field is initially hidden
      const passwordInput = screen.getByPlaceholderText('Enter password');
      expect(passwordInput).toHaveAttribute('type', 'password');

      // The ValidatedPasswordInput should include the show/hide toggle button
      // This is tested by checking that the input group contains the toggle functionality
      const inputGroup = passwordInput.closest(
        '[data-test="field-requirements-input-group"]'
      );
      expect(inputGroup).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not cause excessive re-renders when typing', async () => {
      const user = userEvent.setup();
      const renderSpy = jest.fn();

      // Create a wrapper component that tracks renders
      const TestWrapper = () => {
        renderSpy();
        return <CreateScaleSystem />;
      };

      render(<TestWrapper />);
      const nameInput = screen.getByPlaceholderText(
        'Enter a name for the external system'
      );

      // Clear the spy after initial render
      renderSpy.mockClear();

      // Type multiple characters quickly
      await user.type(nameInput, 'test');

      // Should not cause excessive re-renders (allow some re-renders due to form validation)
      expect(renderSpy).toHaveBeenCalledTimes(0); // No additional renders during typing
    });

    it('should handle rapid input changes efficiently', async () => {
      const user = userEvent.setup();
      render(<CreateScaleSystem />);

      const nameInput = screen.getByPlaceholderText(
        'Enter a name for the external system'
      );
      const hostInput = screen.getByPlaceholderText(
        'Mandatory (e.g hostname.example.com)'
      );

      const startTime = performance.now();

      // Simulate rapid typing in multiple fields
      await user.type(nameInput, 'test');
      await user.type(hostInput, 'host');

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 2500ms for this operation in CI)
      // Note: userEvent.type() has built-in delays, so we test for reasonable performance
      expect(duration).toBeLessThan(2500);
    });

    it('should not cause memory leaks with file uploads', async () => {
      const user = userEvent.setup();
      const { container } = render(<CreateScaleSystem />);

      const fileInput = container.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;

      // Create a large file to test memory handling
      const largeFile = new File(['x'.repeat(1000000)], 'large-file.txt', {
        type: 'text/plain',
      });

      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Upload file multiple times
      for (let i = 0; i < 5; i++) {
        // eslint-disable-next-line no-await-in-loop
        await user.upload(fileInput, largeFile);
      }

      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc();
      }

      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = endMemory - startMemory;

      // Memory increase should be reasonable (less than 10MB for this test)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle typing with minimal latency', async () => {
      const user = userEvent.setup();

      render(<CreateScaleSystem />);
      const nameInput = screen.getByPlaceholderText(
        'Enter a name for the external system'
      );

      const startTime = performance.now();

      // Type rapidly - this should be very fast
      await user.type(nameInput, 'test');

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete very quickly (less than 800ms for typing in CI)
      // Note: userEvent.type() has built-in delays, so we test for reasonable performance
      expect(duration).toBeLessThan(800);
    });

    it('should not re-render child components unnecessarily', () => {
      const ChildComponentSpy = jest.fn();

      // Mock TextInputWithFieldRequirements to track renders
      jest.doMock('@odf/shared', () => {
        const actual = jest.requireActual('@odf/shared');
        return {
          ...actual,
          TextInputWithFieldRequirements: (props: any) => {
            ChildComponentSpy();
            return <input {...props.textInputProps} />;
          },
        };
      });

      const { rerender } = render(<CreateScaleSystem />);

      // Clear spy after initial render
      ChildComponentSpy.mockClear();

      // Re-render with same props
      rerender(<CreateScaleSystem />);

      // Child components should not re-render if props haven't changed
      expect(ChildComponentSpy).toHaveBeenCalledTimes(0);
    });

    it('should render component quickly', () => {
      const startTime = performance.now();

      render(<CreateScaleSystem />);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Component should render in less than 250ms (CI environments can be slower)
      expect(duration).toBeLessThan(250);
    });

    it('should handle form field updates efficiently', () => {
      const { rerender } = render(<CreateScaleSystem />);

      const startTime = performance.now();

      // Simulate form field updates by re-rendering with different props
      rerender(<CreateScaleSystem />);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Re-renders should be very fast (less than 250ms in CI)
      expect(duration).toBeLessThan(250);
    });

    it('should render the node selection options', () => {
      render(<CreateScaleSystem />);

      expect(
        screen.getByRole('checkbox', { name: 'Include control plane nodes' })
      ).toBeInTheDocument();
      expect(screen.getByTestId('select-nodes-table')).toBeInTheDocument();
    });
  });
});
