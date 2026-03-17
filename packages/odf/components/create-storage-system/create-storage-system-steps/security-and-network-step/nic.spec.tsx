import * as React from 'react';
import { NetworkType } from '@odf/core/types';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NICSelectComponent } from './nic';

jest.mock('@odf/shared', () => ({
  useCustomTranslation: () => ({ t: (key: string) => key }),
}));

describe('NICSelectComponent', () => {
  const setPublicCIDR = jest.fn();
  const setCephCIDR = jest.fn();
  const setNetworkType = jest.fn();
  const setUsePublicNetwork = jest.fn();
  const setUseClusterNetwork = jest.fn();

  const defaultProps = {
    cephClusterCIDR: '192.168.100.0/24',
    cephPublicCIDR: '192.168.0.0/32',
    setPublicCIDR,
    setCephCIDR,
    networkType: NetworkType.NIC as NetworkType,
    setNetworkType,
    usePublicNetwork: true,
    useClusterNetwork: true,
    setUsePublicNetwork,
    setUseClusterNetwork,
    nodes: [],
  };

  const renderComponent = (overrides = {}) =>
    render(<NICSelectComponent {...defaultProps} {...overrides} />);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the component with NIC network type (Isolate Ceph network checked)', () => {
    renderComponent({ networkType: NetworkType.NIC });
    expect(screen.getByLabelText('Isolate Ceph network')).toBeChecked();
    expect(screen.getByLabelText('Use public network')).toBeChecked();
    expect(screen.getByLabelText('Use cluster network')).toBeChecked();
    expect(screen.getByLabelText(/Public network CIDR/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cluster network CIDR/)).toBeInTheDocument();
  });

  it('should not show CIDR inputs when HOST network type', () => {
    renderComponent({ networkType: NetworkType.HOST });
    expect(screen.getByLabelText('Isolate Ceph network')).not.toBeChecked();
    expect(
      screen.queryByPlaceholderText('Enter a CIDR block')
    ).not.toBeInTheDocument();
  });

  it('should call setNetworkType when Isolate Ceph network checkbox is clicked', async () => {
    renderComponent({ networkType: NetworkType.HOST });
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Isolate Ceph network'));
    expect(setNetworkType).toHaveBeenCalledWith(NetworkType.NIC);
  });

  it('should call setPublicCIDR when public CIDR input is changed', () => {
    renderComponent({ networkType: NetworkType.NIC, usePublicNetwork: true });
    const publicInput = screen.getByRole('textbox', {
      name: /Public network CIDR/i,
    });
    // fireEvent.change: TextInput onChange receives full value; userEvent.type triggers per-char calls
    fireEvent.change(publicInput, { target: { value: '192.168.1.0/24' } }); // eslint-disable-line testing-library/prefer-user-event
    expect(setPublicCIDR).toHaveBeenCalledWith('192.168.1.0/24');
  });

  it('should call setCephCIDR when cluster CIDR input is changed', () => {
    renderComponent({ networkType: NetworkType.NIC, useClusterNetwork: true });
    const clusterInput = screen.getByRole('textbox', {
      name: /Cluster network CIDR/i,
    });
    // fireEvent.change: TextInput onChange receives full value; userEvent.type triggers per-char calls
    fireEvent.change(clusterInput, { target: { value: '192.168.101.0/24' } }); // eslint-disable-line testing-library/prefer-user-event
    expect(setCephCIDR).toHaveBeenCalledWith('192.168.101.0/24');
  });

  it('should call setUsePublicNetwork when Use public network checkbox is toggled', async () => {
    renderComponent({ networkType: NetworkType.NIC });
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Use public network'));
    expect(setUsePublicNetwork).toHaveBeenCalledWith(false);
  });

  it('should hide public CIDR input when usePublicNetwork is false', () => {
    renderComponent({ networkType: NetworkType.NIC, usePublicNetwork: false });
    expect(
      screen.queryByLabelText(/Public network CIDR/)
    ).not.toBeInTheDocument();
  });

  it('should hide cluster CIDR input when useClusterNetwork is false', () => {
    renderComponent({ networkType: NetworkType.NIC, useClusterNetwork: false });
    expect(
      screen.queryByLabelText(/Cluster network CIDR/)
    ).not.toBeInTheDocument();
  });
});
