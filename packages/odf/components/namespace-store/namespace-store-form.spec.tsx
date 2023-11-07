import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NamespaceStoreForm from './namespace-store-form';

const mockOnCancel = jest.fn();
const props = {
  redirectHandler: () => undefined,
  namespace: 'test-ns',
  onCancel: mockOnCancel,
};

jest.mock('@odf/shared/hooks/useK8sList', () => ({
  __esModule: true,
  useK8sList: () => [
    [
      {
        metadata: {
          name: 'existing-ns-name',
        },
      },
    ],
    true,
    undefined,
  ],
}));

jest.mock('@odf/shared/dropdown/ResourceDropdown', () => () => {
  return <mock-ResourceDropdown />;
});

describe('NamespaceStoreForm', () => {
  it('renders the form', () => {
    render(<NamespaceStoreForm {...props} />);

    const nameInput = screen.getByPlaceholderText('my-namespacestore');
    expect(nameInput).toBeInTheDocument();
  });

  it('clicks on Cancel button', async () => {
    const user = userEvent.setup();
    render(<NamespaceStoreForm {...props} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('clicks on Create button', async () => {
    const user = userEvent.setup();
    const { container } = render(<NamespaceStoreForm {...props} />);

    const mockOnSubmit = jest.fn();
    container.getElementsByClassName('nb-endpoints-form')[0].onsubmit =
      mockOnSubmit;
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(mockOnSubmit).toHaveBeenCalled();
  });
});
