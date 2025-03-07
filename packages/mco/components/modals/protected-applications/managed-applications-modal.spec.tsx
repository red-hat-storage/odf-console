import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ManagedApplicationsModal from './managed-applications-modal';

const closeModal = jest.fn(() => null);
const navigate = jest.fn((route: string) => route);

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  AlertSeverity: { Critical: 'critical' },
}));

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => navigate,
}));

describe('Test managed applications modal (ManagedApplicationsModal)', () => {
  afterEach(() => jest.clearAllMocks());

  it('Renders modal with expected contents', async () => {
    render(<ManagedApplicationsModal isOpen={true} closeModal={closeModal} />);

    // Title
    expect(
      screen.getByText('Enroll ACM managed application')
    ).toBeInTheDocument();
    // Close button
    expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
    // Body
    expect(
      screen.getByText(
        'Follow the below steps to enroll your managed applications to disaster recovery:'
      )
    ).toBeInTheDocument();
    // Footer
    expect(
      screen.getByText('Continue to Applications page')
    ).toBeInTheDocument();
  });

  it('Modal buttons working as expected', async () => {
    const user = userEvent.setup();
    render(<ManagedApplicationsModal isOpen={true} closeModal={closeModal} />);

    await user.click(screen.getByText('Continue to Applications page'));
    expect(closeModal).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
