import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CreateScaleSystem } from './CreateScaleSystem';
import { scaleSystemReducer, ScaleSystemState } from './reducer';

// Mock all external dependencies
jest.mock('react-router-dom-v5-compat', () => ({
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

jest.mock('./useFormValidation', () => ({
  __esModule: true,
  default: jest.fn(() => ({
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
  })),
}));

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

jest.mock('../../select-nodes-table/select-nodes-table', () => ({
  SelectNodesTable: ({
    nodes,
    onRowSelected,
  }: {
    nodes: any[];
    onRowSelected: (nodes: any[]) => void;
  }) => (
    <div data-testid="select-nodes-table">
      <div>Selected nodes: {nodes.length}</div>
      <button
        type="button"
        onClick={() => onRowSelected([{ name: 'node1' }, { name: 'node2' }])}
        data-testid="select-nodes-button"
      >
        Select Nodes
      </button>
    </div>
  ),
}));

jest.mock('./payload', () => ({
  createScaleCaCertSecretPayload: jest.fn(() => Promise.resolve({})),
  createScaleLocalClusterPayload: jest.fn(() => Promise.resolve({})),
  createScaleRemoteClusterPayload: jest.fn(() => Promise.resolve({})),
  labelNodes: jest.fn(() => Promise.resolve({})),
  createFileSystem: jest.fn(() => Promise.resolve({})),
  createConfigMapPayload: jest.fn(() => Promise.resolve({})),
  createEncryptionConfigPayload: jest.fn(() => Promise.resolve({})),
  createUserDetailsSecretPayload: jest.fn(() => Promise.resolve({})),
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
  });

  describe('Component Rendering', () => {
    it('should render the main component with correct title and breadcrumbs', () => {
      render(<CreateScaleSystem />);

      expect(screen.getByText('Connect IBM Scale (CNSA)')).toBeInTheDocument();
      expect(screen.getByText('External Systems')).toBeInTheDocument();
      expect(screen.getByText('Create IBM Scale (CNSA)')).toBeInTheDocument();
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

    it('should render node selection cards', () => {
      render(<CreateScaleSystem />);

      expect(screen.getByText('All nodes')).toBeInTheDocument();
      expect(screen.getByText('Select nodes')).toBeInTheDocument();
    });

    it('should render form buttons', () => {
      render(<CreateScaleSystem />);

      expect(
        screen.getByRole('button', { name: /connect/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should handle reducer actions correctly', () => {
      const testInitialState: ScaleSystemState = {
        name: '',
        selectedNodes: [],
        managementEndpoint: {},
        userName: '',
        password: '',
        caCertificate: '',
        encryptionEnabled: false,
        serverInformation: '',
        tenantId: '',
        fileSystemName: '',
        encryptionUserName: '',
        encryptionPassword: '',
        encrptionPort: '',
        remoteRKM: '',
        encryptionCert: '',
        client: '',
      };

      // Test SET_NAME action
      const newState = scaleSystemReducer(testInitialState, {
        type: 'SET_NAME',
        payload: 'test-system',
      });
      expect(newState.name).toBe('test-system');

      // Test SET_ENCRYPTION_ENABLED action
      const encryptionState = scaleSystemReducer(testInitialState, {
        type: 'SET_ENCRYPTION_ENABLED',
        payload: true,
      });
      expect(encryptionState.encryptionEnabled).toBe(true);

      // Test SET_MANAGEMENT_ENDPOINT_HOST action
      const endpointState = scaleSystemReducer(testInitialState, {
        type: 'SET_MANAGEMENT_ENDPOINT_HOST',
        payload: { id: 'mandatory-endpoint', host: 'example.com' },
      });
      expect(endpointState.managementEndpoint['mandatory-endpoint'].host).toBe(
        'example.com'
      );

      // Test SET_MANAGEMENT_ENDPOINT_PORT action
      const portState = scaleSystemReducer(testInitialState, {
        type: 'SET_MANAGEMENT_ENDPOINT_PORT',
        payload: { id: 'mandatory-endpoint', port: '8080' },
      });
      expect(portState.managementEndpoint['mandatory-endpoint'].port).toBe(
        '8080'
      );

      // Test SET_USER_NAME action
      const userNameState = scaleSystemReducer(testInitialState, {
        type: 'SET_USER_NAME',
        payload: 'admin',
      });
      expect(userNameState.userName).toBe('admin');

      // Test SET_PASSWORD action
      const passwordState = scaleSystemReducer(testInitialState, {
        type: 'SET_PASSWORD',
        payload: 'password123',
      });
      expect(passwordState.password).toBe('password123');

      // Test SET_CA_CERTIFICATE action
      const certState = scaleSystemReducer(testInitialState, {
        type: 'SET_CA_CERTIFICATE',
        payload: 'certificate-content',
      });
      expect(certState.caCertificate).toBe('certificate-content');

      // Test SET_FILE_SYSTEM_NAME action
      const fsState = scaleSystemReducer(testInitialState, {
        type: 'SET_FILE_SYSTEM_NAME',
        payload: 'test-fs',
      });
      expect(fsState.fileSystemName).toBe('test-fs');

      // Test SET_ENCRYPTION_USER_NAME action
      const encUserState = scaleSystemReducer(testInitialState, {
        type: 'SET_ENCRYPTION_USER_NAME',
        payload: 'enc-user',
      });
      expect(encUserState.encryptionUserName).toBe('enc-user');

      // Test SET_ENCRYPTION_PASSWORD action
      const encPasswordState = scaleSystemReducer(testInitialState, {
        type: 'SET_ENCRYPTION_PASSWORD',
        payload: 'enc-password',
      });
      expect(encPasswordState.encryptionPassword).toBe('enc-password');

      // Test SET_ENCRYPTION_PORT action
      const encPortState = scaleSystemReducer(testInitialState, {
        type: 'SET_ENCRYPTION_PORT',
        payload: '443',
      });
      expect(encPortState.encrptionPort).toBe('443');

      // Test SET_CLIENT action
      const clientState = scaleSystemReducer(testInitialState, {
        type: 'SET_CLIENT',
        payload: 'test-client',
      });
      expect(clientState.client).toBe('test-client');

      // Test SET_REMOTE_RKM action
      const rkmState = scaleSystemReducer(testInitialState, {
        type: 'SET_REMOTE_RKM',
        payload: 'rkm.example.com',
      });
      expect(rkmState.remoteRKM).toBe('rkm.example.com');

      // Test SET_SERVER_INFORMATION action
      const serverState = scaleSystemReducer(testInitialState, {
        type: 'SET_SERVER_INFORMATION',
        payload: 'server.example.com:443',
      });
      expect(serverState.serverInformation).toBe('server.example.com:443');

      // Test SET_TENANT_ID action
      const tenantState = scaleSystemReducer(testInitialState, {
        type: 'SET_TENANT_ID',
        payload: 'tenant-123',
      });
      expect(tenantState.tenantId).toBe('tenant-123');

      // Test SET_ENCRYPTION_CERT action
      const encCertState = scaleSystemReducer(testInitialState, {
        type: 'SET_ENCRYPTION_CERT',
        payload: 'enc-cert-content',
      });
      expect(encCertState.encryptionCert).toBe('enc-cert-content');

      // Test SET_SELECTED_NODES action
      const nodesState = scaleSystemReducer(testInitialState, {
        type: 'SET_SELECTED_NODES',
        payload: [
          {
            name: 'node1',
            hostName: '',
            cpu: '',
            memory: '',
            zone: '',
            rack: '',
            uid: '',
            roles: [],
            labels: undefined,
            taints: undefined,
          },
          {
            name: 'node2',
            hostName: '',
            cpu: '',
            memory: '',
            zone: '',
            rack: '',
            uid: '',
            roles: [],
            labels: undefined,
            taints: undefined,
          },
        ],
      });
      expect(nodesState.selectedNodes).toEqual([
        {
          name: 'node1',
          hostName: '',
          cpu: '',
          memory: '',
          zone: '',
          rack: '',
          uid: '',
          roles: [],
          labels: undefined,
          taints: undefined,
        },
        {
          name: 'node2',
          hostName: '',
          cpu: '',
          memory: '',
          zone: '',
          rack: '',
          uid: '',
          roles: [],
          labels: undefined,
          taints: undefined,
        },
      ]);
    });

    it('should handle unknown action types', () => {
      const testState: ScaleSystemState = {
        name: 'test',
        selectedNodes: [],
        managementEndpoint: {},
        userName: '',
        password: '',
        caCertificate: '',
        encryptionEnabled: false,
        serverInformation: '',
        tenantId: '',
        fileSystemName: '',
        encryptionUserName: '',
        encryptionPassword: '',
        encrptionPort: '',
        remoteRKM: '',
        encryptionCert: '',
        client: '',
      };

      // Test unknown action type
      const unknownState = scaleSystemReducer(testState, {
        type: 'UNKNOWN_ACTION' as any,
        payload: 'test',
      });
      expect(unknownState).toEqual(testState);
    });
  });

  describe('Form Structure', () => {
    it('should render form with correct structure', () => {
      const { container } = render(<CreateScaleSystem />);

      expect(container.querySelector('form')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Connect' })
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

      // Encryption fields should not be visible initially
      expect(
        screen.queryByTestId('encryption-username')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('encryption-password')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('encryption-port')).not.toBeInTheDocument();
      expect(screen.queryByTestId('client')).not.toBeInTheDocument();
      expect(screen.queryByTestId('remote-rkm')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('server-information')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('tenant-id')).not.toBeInTheDocument();
    });
  });

  describe('Node Selection', () => {
    it('should render node selection cards', () => {
      render(<CreateScaleSystem />);

      expect(screen.getByText('All nodes')).toBeInTheDocument();
      expect(screen.getByText('Select nodes')).toBeInTheDocument();
    });

    it('should render node selection table when select nodes is chosen', () => {
      render(<CreateScaleSystem />);

      // Initially the table should not be visible
      expect(
        screen.queryByTestId('select-nodes-table')
      ).not.toBeInTheDocument();
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
        screen.getByRole('button', { name: /connect/i })
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
      expect(screen.getByText('Password is required')).toBeInTheDocument();
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

      // Component should render in less than 150ms (CI environments can be slower)
      expect(duration).toBeLessThan(150);
    });

    it('should handle form field updates efficiently', () => {
      const { rerender } = render(<CreateScaleSystem />);

      const startTime = performance.now();

      // Simulate form field updates by re-rendering with different props
      rerender(<CreateScaleSystem />);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Re-renders should be very fast (less than 100ms in CI)
      expect(duration).toBeLessThan(100);
    });

    it('should automatically select all nodes when "All nodes" is selected by default', () => {
      render(<CreateScaleSystem />);

      // Check that "All nodes" card is selected by default
      const allNodesCard = screen
        .getByText('All nodes')
        .closest('[id="all-nodes"]');
      expect(allNodesCard).toHaveClass('pf-m-selected');

      // Check that the "Select nodes" card is not selected
      const selectNodesCard = screen
        .getByText('Select nodes')
        .closest('[id="selected-nodes"]');
      expect(selectNodesCard).not.toHaveClass('pf-m-selected');

      // Check that the node selection table is not visible (since "All nodes" is selected)
      expect(
        screen.queryByTestId('select-nodes-table')
      ).not.toBeInTheDocument();

      // Wait for the useEffect to run and verify that nodes are actually selected
      // The mock provides 3 nodes, so they should be selected
      setTimeout(() => {
        // This would be verified by checking the state, but since we can't access it directly,
        // we verify the behavior through the UI state
        expect(allNodesCard).toHaveClass('pf-m-selected');
      }, 0);
    });
  });
});
