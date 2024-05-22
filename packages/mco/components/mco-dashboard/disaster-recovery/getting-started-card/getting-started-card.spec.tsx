import * as React from 'react';
import { EnrollApplicationButton } from '@odf/mco/components/protected-applications/components';
import { gettingStartedDRDocs } from '@odf/mco/constants';
import { render, screen, fireEvent } from '@testing-library/react';
import { GettingStartedCard } from './getting-started-card';

const setIsOpen = jest.fn(() => null);
const navigate = jest.fn(() => null);

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useFlag: jest.fn(() => true),
  useK8sWatchResource: jest.fn(() => [['policy1', 'policy2'], true, '']),
  useUserSettings: jest.fn(() => [true, setIsOpen]),
  AlertSeverity: { Critical: 'critical' },
}));

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => navigate,
}));

jest.mock('@odf/shared/hooks', () => ({
  ...jest.requireActual('@odf/shared/hooks'),
  DOC_VERSION: '1.2',
}));

jest.mock('@odf/mco/components/protected-applications/components', () => ({
  ...jest.requireActual(
    '@odf/mco/components/protected-applications/components'
  ),
  EnrollApplicationButton: jest.fn(() => null),
}));

describe('Test getting started card (GettingStartedCard)', () => {
  afterEach(() => jest.clearAllMocks());

  it('Renders card with all the steps and their details', async () => {
    render(<GettingStartedCard />);

    // header -- title
    expect(screen.getByText('Create policy')).toBeInTheDocument();
    expect(screen.getByText('Enroll applications')).toBeInTheDocument();
    expect(
      screen.getByText('Monitoring resources (optional)')
    ).toBeInTheDocument();

    // body -- doc link
    expect(screen.getByText('See documentation')).toHaveAttribute(
      'href',
      gettingStartedDRDocs('1.2').CREATE_POLICY
    );
    expect(screen.getByText('Steps to enable monitoring')).toHaveAttribute(
      'href',
      gettingStartedDRDocs('1.2').ENABLE_MONITORING
    );

    // footer -- button
    const policyButton = screen.getByRole('button', {
      name: 'Create a disaster recovery policy',
    });
    expect(policyButton).toBeInTheDocument();
    fireEvent.click(policyButton);
    expect(navigate).toHaveBeenCalledTimes(1);

    const viewPolicyButton = screen.getByRole('button', {
      name: 'View policies',
    });
    expect(viewPolicyButton).toBeInTheDocument();
    fireEvent.click(viewPolicyButton);
    expect(navigate).toHaveBeenCalledTimes(2); // called once before via "policyButton" click

    expect(EnrollApplicationButton).toHaveBeenCalledTimes(1);
  });
});
