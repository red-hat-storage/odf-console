import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetCephRBDStorageClassDefault } from './set-rbd-sc-default';

describe('Setting Ceph RBD StorageClass as default, during installation', () => {
  it('renders the FC, on infra with existing default StorageClass', async () => {
    const uEvent = userEvent.setup();
    const Wrapper = () => {
      const [isRBDStorageClassDefault, dispatch] = React.useState(null);
      const dispatchWrapper = ({ payload }) => dispatch(payload);
      return (
        <SetCephRBDStorageClassDefault
          doesDefaultSCAlreadyExists={true}
          isRBDStorageClassDefault={isRBDStorageClassDefault}
          dispatch={dispatchWrapper}
        />
      );
    };

    const { container, rerender } = render(<Wrapper />);
    const checkbox = container.querySelector(
      '[data-test="set-rbd-sc-default"]'
    ) as HTMLInputElement;

    expect(
      screen.getByText('Use Ceph RBD as the default StorageClass')
    ).toBeInTheDocument();

    // by defaut checkbox should not be checked
    expect(checkbox.checked).toBe(false);

    // on clicking, checkbox should get checked
    await uEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    // re-render should not change the checkbox state
    rerender(<Wrapper />);
    expect(checkbox.checked).toBe(true);
  });

  it('renders the FC, on infra with non-existing default StorageClass', async () => {
    const uEvent = userEvent.setup();
    const Wrapper = () => {
      const [isRBDStorageClassDefault, dispatch] = React.useState(null);
      const dispatchWrapper = ({ payload }) => dispatch(payload);
      return (
        <SetCephRBDStorageClassDefault
          doesDefaultSCAlreadyExists={false}
          isRBDStorageClassDefault={isRBDStorageClassDefault}
          dispatch={dispatchWrapper}
        />
      );
    };

    const { container, rerender } = render(<Wrapper />);
    const checkbox = container.querySelector(
      '[data-test="set-rbd-sc-default"]'
    ) as HTMLInputElement;

    expect(
      screen.getByText('Use Ceph RBD as the default StorageClass')
    ).toBeInTheDocument();

    // by defaut checkbox should be checked
    expect(checkbox.checked).toBe(true);

    // on clicking, checkbox should get un-checked
    await uEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    // re-render should not change the checkbox state
    rerender(<Wrapper />);
    expect(checkbox.checked).toBe(false);
  });
});
