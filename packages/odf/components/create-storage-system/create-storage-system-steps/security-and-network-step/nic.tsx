import * as React from 'react';
import { NetworkType } from '@odf/core/types';
import { useCustomTranslation } from '@odf/shared';
import {
  FormGroup,
  TextInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Checkbox,
} from '@patternfly/react-core';
import {
  isIpInCidr,
  isValidCIDRFormat,
  getMonIp,
} from '../../../utils/cidr-utils';
import './nic.scss';

type NICSelectComponentProps = {
  cephPublicCIDR: string;
  cephClusterCIDR: string;
  setPublicCIDR: (cidr: string) => void;
  setCephCIDR: (cidr: string) => void;
  networkType: NetworkType;
  setNetworkType: (networkType: NetworkType) => void;
  usePublicNetwork: boolean;
  useClusterNetwork: boolean;
  setUsePublicNetwork: (val: boolean) => void;
  setUseClusterNetwork: (val: boolean) => void;
  nodes?: {
    annotations?: Record<string, string>;
    metadata?: { annotations?: Record<string, string> };
  }[];
};

export const NICSelectComponent: React.FC<NICSelectComponentProps> = ({
  cephClusterCIDR,
  cephPublicCIDR,
  setCephCIDR,
  setPublicCIDR,
  networkType,
  setNetworkType,
  usePublicNetwork,
  useClusterNetwork,
  setUsePublicNetwork,
  setUseClusterNetwork,
  nodes = [],
}) => {
  const { t } = useCustomTranslation();

  const isIsolateCephNetwork = networkType === NetworkType.NIC;

  const handleIsolateCephChange = (checked: boolean) => {
    setNetworkType(checked ? NetworkType.NIC : NetworkType.HOST);
  };

  const publicCidrValidFormat = isValidCIDRFormat(cephPublicCIDR);
  const clusterCidrValidFormat = isValidCIDRFormat(cephClusterCIDR);
  const allNodesHaveMonIp = nodes.every((n) => (getMonIp(n)?.length ?? 0) > 0);

  const publicMonIpsInCidr =
    !usePublicNetwork ||
    nodes.length === 0 ||
    nodes.every((n) => {
      const ip = getMonIp(n);
      return !ip || isIpInCidr(ip, cephPublicCIDR);
    });
  const clusterMonIpsInCidr =
    !useClusterNetwork ||
    nodes.length === 0 ||
    nodes.every((n) => {
      const ip = getMonIp(n);
      return !ip || isIpInCidr(ip, cephClusterCIDR);
    });

  const publicCidrValid =
    usePublicNetwork &&
    publicCidrValidFormat &&
    (nodes.length === 0 || (allNodesHaveMonIp && publicMonIpsInCidr));
  const publicCidrError =
    (usePublicNetwork &&
      cephPublicCIDR.trim() &&
      (!publicCidrValidFormat
        ? t('Must use CIDR notation. Eg: 192.168.200.0/24')
        : nodes.length > 0 &&
          !allNodesHaveMonIp &&
          t(
            'All selected nodes must have the network.rook.io/mon-ip annotation when using a dedicated storage network.'
          ))) ||
    (usePublicNetwork &&
      cephPublicCIDR.trim() &&
      publicCidrValidFormat &&
      allNodesHaveMonIp &&
      !publicMonIpsInCidr &&
      t(
        'The network.rook.io/mon-ip annotation on one or more nodes is outside the Public network CIDR. Verify the CIDR matches your node IPs or use the CLI to correct the annotations.'
      ));

  const clusterCidrValid =
    useClusterNetwork &&
    clusterCidrValidFormat &&
    (nodes.length === 0 || (allNodesHaveMonIp && clusterMonIpsInCidr));
  const clusterCidrError =
    (useClusterNetwork &&
      cephClusterCIDR.trim() &&
      (!clusterCidrValidFormat
        ? t('Must use CIDR notation. Eg: 192.168.200.0/24')
        : nodes.length > 0 &&
          !allNodesHaveMonIp &&
          t(
            'All selected nodes must have the network.rook.io/mon-ip annotation when using a dedicated storage network.'
          ))) ||
    (useClusterNetwork &&
      cephClusterCIDR.trim() &&
      clusterCidrValidFormat &&
      allNodesHaveMonIp &&
      !clusterMonIpsInCidr &&
      t(
        'The network.rook.io/mon-ip annotation on one or more nodes is outside the Cluster network CIDR. Verify the CIDR matches your node IPs or use the CLI to correct the annotations.'
      ));

  return (
    <>
      <Checkbox
        isChecked={isIsolateCephNetwork}
        onChange={(_, checked) => handleIsolateCephChange(!!checked)}
        label={t('Isolate Ceph network')}
        id="isolate-ceph-network"
        description={t(
          'Specify the public or cluster network interfaces that Ceph will use for data traffic.'
        )}
      />
      {isIsolateCephNetwork && (
        <div className="pf-v6-u-ml-lg pf-v6-u-mt-md">
          <Checkbox
            isChecked={usePublicNetwork}
            onChange={(_, checked) => setUsePublicNetwork(!!checked)}
            label={t('Use public network')}
            id="use-public-network"
            description={t(
              'Nodes must be annotated with network.rook.io/mon-ip: <IPAddress> to set the correct IP address for the mon before proceeding with the host networking configuration. This ensures that the mons operate on the desired network.'
            )}
          />
          {usePublicNetwork && (
            <div className="pf-v6-u-ml-lg pf-v6-u-mt-sm">
              <FormGroup
                label={t('Public network CIDR')}
                fieldId="ceph-public-cidr"
                className="odf-install-network__form-group"
              >
                <TextInput
                  value={cephPublicCIDR}
                  onChange={(_, cidr) => setPublicCIDR(cidr)}
                  type="text"
                  id="ceph-public-cidr"
                  placeholder={t('Enter a CIDR block')}
                  validated={
                    publicCidrError
                      ? 'error'
                      : publicCidrValid
                        ? 'success'
                        : 'default'
                  }
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem
                      variant={
                        publicCidrError
                          ? 'error'
                          : publicCidrValid
                            ? 'success'
                            : 'default'
                      }
                    >
                      {(typeof publicCidrError === 'string'
                        ? publicCidrError
                        : null) ??
                        (publicCidrValid && nodes.length > 0
                          ? t(
                              'network.rook.io/mon-ip annotation on all selected nodes.'
                            )
                          : t('Use CIDR notation. Eg: 192.168.200.0/24'))}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            </div>
          )}

          <Checkbox
            isChecked={useClusterNetwork}
            onChange={(_, checked) => setUseClusterNetwork(!!checked)}
            label={t('Use cluster network')}
            id="use-cluster-network"
            className="pf-v6-u-mt-md"
          />
          {useClusterNetwork && (
            <div className="pf-v6-u-ml-lg pf-v6-u-mt-sm">
              <FormGroup
                label={t('Cluster network CIDR')}
                fieldId="ceph-cluster-cidr"
                className="odf-install-network__form-group"
              >
                <TextInput
                  value={cephClusterCIDR}
                  onChange={(_, cidr) => setCephCIDR(cidr)}
                  type="text"
                  id="ceph-cluster-cidr"
                  placeholder={t('Enter a CIDR block')}
                  validated={
                    clusterCidrError
                      ? 'error'
                      : clusterCidrValid
                        ? 'success'
                        : 'default'
                  }
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem
                      variant={
                        clusterCidrError
                          ? 'error'
                          : clusterCidrValid
                            ? 'success'
                            : 'default'
                      }
                    >
                      {(typeof clusterCidrError === 'string'
                        ? clusterCidrError
                        : null) ??
                        (clusterCidrValid && nodes.length > 0
                          ? t('Validated')
                          : t('Use CIDR notation. Eg: 192.168.200.0/24'))}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            </div>
          )}
        </div>
      )}
    </>
  );
};
