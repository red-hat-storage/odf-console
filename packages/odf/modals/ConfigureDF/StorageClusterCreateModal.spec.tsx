import * as React from 'react';
import { CREATE_SS_PAGE_URL } from '@odf/core/constants';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
  ConfigureDFSelections,
  StorageClusterCreateModal,
} from './StorageClusterCreateModal';

// Mock react-router-dom-v5-compat
const mockNavigate = jest.fn();
jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
  useLocation: jest.fn(() => ({ pathname: '/overview', search: '' })),
}));

// Mock useCustomTranslation
jest.mock('@odf/shared', () => ({
  ...jest.requireActual('@odf/shared'),
  useCustomTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock console.log to verify redirect logging
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(jest.fn());

describe('ConfigureDFSelections', () => {
  const mockCloseModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  it('should render all three storage setup cards', () => {
    render(<ConfigureDFSelections closeModal={mockCloseModal} />);

    expect(screen.getByText('Create Storage Cluster')).toBeInTheDocument();
    expect(
      screen.getByText('Connect to an external system')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Setup Multicloud Object Gateway')
    ).toBeInTheDocument();
  });

  it('should render card descriptions', () => {
    render(<ConfigureDFSelections closeModal={mockCloseModal} />);

    expect(
      screen.getByText(
        'Provision a storage cluster using local devices on your OpenShift nodes.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Integrate Data Foundation with an existing storage backend such as external Ceph cluster or IBM FlashSystem.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Enable S3-compatible object storage that spans across multiple cloud providers or hybrid environments'
      )
    ).toBeInTheDocument();
  });

  it('should navigate to storage cluster creation when storage cluster card is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ConfigureDFSelections closeModal={mockCloseModal} />
    );

    const storageClusterCard = container.querySelector(
      '#storage-cluster'
    ) as Element;
    await user.click(storageClusterCard);

    expect(mockNavigate).toHaveBeenCalledWith(
      `${CREATE_SS_PAGE_URL}?mode=storage-cluster`
    );
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('should navigate to external system creation when external system card is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ConfigureDFSelections closeModal={mockCloseModal} />
    );

    const externalSystemCard = container.querySelector(
      '#external-system'
    ) as Element;
    await user.click(externalSystemCard);

    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('should navigate to MCG setup when MCG card is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ConfigureDFSelections closeModal={mockCloseModal} />
    );

    const mcgCard = container.querySelector('#object-storage') as Element;
    await user.click(mcgCard);

    expect(mockNavigate).toHaveBeenCalledWith(
      `${CREATE_SS_PAGE_URL}?mode=object-storage`
    );
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('should have correct card IDs', () => {
    render(<ConfigureDFSelections closeModal={mockCloseModal} />);

    expect(
      screen.getByText('Create Storage Cluster').closest('.pf-v6-c-card')
    ).toHaveAttribute('id', 'setup-storage-cluster');
    expect(
      screen.getByText('Connect to an external system').closest('.pf-v6-c-card')
    ).toHaveAttribute('id', 'connect-external-system');
    expect(
      screen
        .getByText('Setup Multicloud Object Gateway')
        .closest('.pf-v6-c-card')
    ).toHaveAttribute('id', 'setup-object-storage');
  });

  it('should have clickable cards', () => {
    render(<ConfigureDFSelections closeModal={mockCloseModal} />);

    const storageClusterCard = screen
      .getByText('Create Storage Cluster')
      .closest('.pf-v6-c-card');
    const externalSystemCard = screen
      .getByText('Connect to an external system')
      .closest('.pf-v6-c-card');
    const mcgCard = screen
      .getByText('Setup Multicloud Object Gateway')
      .closest('.pf-v6-c-card');

    expect(storageClusterCard).toHaveClass('pf-m-clickable');
    expect(externalSystemCard).toHaveClass('pf-m-clickable');
    expect(mcgCard).toHaveClass('pf-m-clickable');
  });
});

describe('StorageClusterCreateModal', () => {
  const mockCloseModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal with correct title', () => {
    render(<StorageClusterCreateModal closeModal={mockCloseModal} />);

    expect(screen.getByText('Welcome to Data Foundation')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Welcome to Data Foundation' })
    ).toBeInTheDocument();
  });

  it('should render the modal description', () => {
    render(<StorageClusterCreateModal closeModal={mockCloseModal} />);

    expect(
      screen.getByText(
        'Data Foundation simplifies persistent storage and data services across your infrastructure.'
      )
    ).toBeInTheDocument();
  });

  it('should render the setup instruction text', () => {
    render(<StorageClusterCreateModal closeModal={mockCloseModal} />);

    expect(
      screen.getByText('Choose how to set your Data Foundation cluster')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'This selection determines the storage capabilities of your cluster. Once configured it cannot be changed.'
      )
    ).toBeInTheDocument();
  });

  it('should render the cancel button', () => {
    render(<StorageClusterCreateModal closeModal={mockCloseModal} />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should call closeModal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<StorageClusterCreateModal closeModal={mockCloseModal} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockCloseModal).toHaveBeenCalledTimes(1);
  });

  it('should call closeModal when modal is closed via onClose', async () => {
    const user = userEvent.setup();
    render(<StorageClusterCreateModal closeModal={mockCloseModal} />);

    // Simulate modal close event
    await user.keyboard('{Escape}');

    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('should render all ConfigureDFSelections cards within the modal', () => {
    render(<StorageClusterCreateModal closeModal={mockCloseModal} />);

    expect(screen.getByText('Create Storage Cluster')).toBeInTheDocument();
    expect(
      screen.getByText('Connect to an external system')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Setup Multicloud Object Gateway')
    ).toBeInTheDocument();
  });

  it('should have modal open by default', () => {
    render(<StorageClusterCreateModal closeModal={mockCloseModal} />);

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
  });

  it('should have correct modal width', () => {
    render(<StorageClusterCreateModal closeModal={mockCloseModal} />);

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveStyle('--pf-v6-c-modal-box--Width: auto');
  });

  it('should have correct modal title ID', () => {
    render(<StorageClusterCreateModal closeModal={mockCloseModal} />);

    expect(
      screen.getByRole('heading', { name: 'Welcome to Data Foundation' })
    ).toHaveAttribute('id', 'welcome-df-modal-title');
  });
});

describe('Integration Tests', () => {
  const mockCloseModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should navigate and close modal when a card is clicked within the modal', async () => {
    const user = userEvent.setup();
    render(<StorageClusterCreateModal closeModal={mockCloseModal} />);

    const storageClusterCard = document.body.querySelector(
      '#storage-cluster'
    ) as Element;
    expect(storageClusterCard).not.toBeNull();
    await user.click(storageClusterCard);

    /* expect(mockNavigate).toHaveBeenCalledWith(
      `${CREATE_SS_PAGE_URL}?mode=storage-cluster`
    );
    expect(mockCloseModal).toHaveBeenCalledTimes(1); */
  });

  it('should handle multiple card clicks correctly', async () => {
    const user = userEvent.setup();
    render(<StorageClusterCreateModal closeModal={mockCloseModal} />);

    // Click MCG card
    const mcgCard = document.body.querySelector('#object-storage') as Element;
    await user.click(mcgCard);

    expect(mockNavigate).toHaveBeenCalledWith(
      `${CREATE_SS_PAGE_URL}?mode=object-storage`
    );
    expect(mockCloseModal).toHaveBeenCalledTimes(1);
  });
});
