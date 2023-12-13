import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DRPolicyListPage } from './drpolicy-list-page';

let testCase = 1;

jest.mock(
  '@openshift-console/dynamic-plugin-sdk/lib/api/dynamic-core-api',
  () => ({
    ...jest.requireActual(
      '@openshift-console/dynamic-plugin-sdk/lib/api/dynamic-core-api'
    ),
    useListPageFilter: jest.fn(() => {
      if ([1, 2, 3].includes(testCase)) {
        return [[], [], jest.fn()];
      }
    }),
    useK8sWatchResource: jest.fn(() => {
      if (testCase === 1) {
        return [[], true, ''];
      } else if (testCase === 2) {
        return [
          [],
          true,
          {
            response: {
              status: 404,
            },
          },
        ];
      } else if (testCase === 3) {
        return [[], false, ''];
      }
    }),
  })
);

jest.mock('@odf/mco/hooks/applications-hook', () => ({
  useApplicationsWatch: jest.fn(() => {
    if ([1, 2, 3].includes(testCase)) {
      return [[], true, ''];
    }
  }),
}));

jest.mock('@odf/shared/hooks/rbac-hook', () => ({
  useAccessReview: jest.fn(() => [true, false]),
}));

jest.mock('react-router-dom-v5-compat', () => ({
  useLocation: jest.fn(() => ({ pathname: '' })),
  useNavigate: jest.fn(() => []),
}));

jest.doMock('../../../assets/EmptyPageIcon.png', () => '');

jest.mock('react-i18next', () => ({
  useTranslation: (_ns: string) => ({ t: (children: any) => children }),
  Trans: ({ children }: any) => children,
}));

describe('Test drpolicy list page', () => {
  test('Empty page success test', async () => {
    render(<DRPolicyListPage />);
    expect(
      screen.getByText('No disaster recovery policies yet')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Create DRPolicy')).toHaveAttribute(
      'aria-disabled',
      'false'
    );
  });

  test('Empty page un authorized test', async () => {
    testCase = 2;
    render(<DRPolicyListPage />);
    expect(
      screen.getByText('No disaster recovery policies yet')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Create DRPolicy')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    // Tooltip content check
    fireEvent.mouseEnter(screen.getByLabelText('Create DRPolicy'));
    expect(
      await screen.findByText(
        'You are not authorized to complete this action. See your cluster administrator for role-based access control information.'
      )
    ).toBeInTheDocument();
  });

  test('Empty page loading test', async () => {
    testCase = 3;
    render(<DRPolicyListPage />);
    expect(screen.getByLabelText('Loading Empty Page')).toBeInTheDocument();
  });
});
