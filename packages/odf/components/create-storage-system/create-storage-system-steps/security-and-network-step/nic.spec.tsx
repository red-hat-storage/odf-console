import * as React from 'react';
import { NetworkType } from '@odf/core/types';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { NICSelectComponent } from './nic';

jest.mock('@odf/shared', () => ({
  useCustomTranslation: () => ({ t: (key: string) => key }),
}));

describe('NICSelectComponent', () => {
  const setPublicCIDR = jest.fn();
  const setCephCIDR = jest.fn();
  const setNetworkType = jest.fn();

  const renderComponent = (networkType: NetworkType) =>
    render(
      <NICSelectComponent
        cephClusterCIDR="192.168.100.0/24"
        cephPublicCIDR="192.168.0.0/32"
        setPublicCIDR={setPublicCIDR}
        setCephCIDR={setCephCIDR}
        networkType={networkType}
        setNetworkType={setNetworkType}
      />
    );

  it('should render the component with NIC network type', () => {
    renderComponent(NetworkType.NIC);
    expect(
      screen.getByLabelText('Isolate network using NIC Operators')
    ).toBeChecked();
    expect(screen.getByText('Ceph Cluster CIDR')).toBeInTheDocument();
    expect(screen.getByText('Ceph Public CIDR')).toBeInTheDocument();
  });

  it('should render the component with HOST network type', () => {
    renderComponent(NetworkType.HOST);
    expect(
      screen.getByLabelText('Isolate network using NIC Operators')
    ).not.toBeChecked();
    expect(screen.queryByText('Ceph Cluster CIDR')).not.toBeInTheDocument();
    expect(screen.queryByText('Ceph Public CIDR')).not.toBeInTheDocument();
  });

  it('should call setNetworkType when checkbox is clicked', async () => {
    renderComponent(NetworkType.HOST);
    const user = userEvent.setup();
    await user.click(
      screen.getByLabelText('Isolate network using NIC Operators')
    );
    expect(setNetworkType).toHaveBeenCalledWith(NetworkType.NIC);
  });

  it('should call setPublicCIDR when public CIDR input is changed', () => {
    renderComponent(NetworkType.NIC);
    const input = screen.getByPlaceholderText(
      'Enter a CIDR block (Eg: 192.168.0.0/32)'
    );
    fireEvent.change(input, { target: { value: '192.168.1.0/24' } });
    expect(setPublicCIDR).toHaveBeenCalledWith('192.168.1.0/24');
  });

  it('should call setCephCIDR when cluster CIDR input is changed', () => {
    renderComponent(NetworkType.NIC);
    const input = screen.getByPlaceholderText(
      'Enter a CIDR block (Eg: 192.168.100.0/24)'
    );
    fireEvent.change(input, { target: { value: '192.168.101.0/24' } });
    expect(setCephCIDR).toHaveBeenCalledWith('192.168.101.0/24');
  });
});
