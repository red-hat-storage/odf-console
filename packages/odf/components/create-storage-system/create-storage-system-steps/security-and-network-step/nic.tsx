import * as React from 'react';
import { NetworkType } from '@odf/core/types';
import { useCustomTranslation } from '@odf/shared';
import {
  FormGroup,
  TextInput,
  Form,
  Checkbox,
  Alert,
} from '@patternfly/react-core';
import './nic.scss';

type NICSelectComponentProps = {
  cephPublicCIDR: string;
  cephClusterCIDR: string;
  setPublicCIDR: (cidr: string) => void;
  setCephCIDR: (cidr: string) => void;
  networkType: NetworkType;
  setNetworkType: (networkType: NetworkType) => void;
};

export const NICSelectComponent: React.FC<NICSelectComponentProps> = ({
  cephClusterCIDR,
  cephPublicCIDR,
  setCephCIDR,
  setPublicCIDR,
  networkType,
  setNetworkType,
}) => {
  const { t } = useCustomTranslation();
  return (
    <>
      <Checkbox
        isChecked={NetworkType.NIC === networkType}
        label={t('Isolate network using NIC Operators')}
        onChange={() =>
          setNetworkType(
            networkType === NetworkType.HOST
              ? NetworkType.NIC
              : NetworkType.HOST
          )
        }
        id="nic-checkbox"
        description={t(
          'Specify the public and network interfaces that Ceph will use for data traffic. Use CIDR notation to define the IP addresses which will bind to on the host.'
        )}
      />
      {networkType === NetworkType.NIC && (
        <>
          <Alert
            variant="info"
            title={t(
              'Nodes must be annotated with network.rook.io/mon-ip: <IPAddress> to set the correct IP address for the mon before proceeding with the host networking configuration. This ensures that the mons operate on the desired network'
            )}
            isInline
          />
          <Form>
            <FormGroup
              label={t('Ceph Cluster CIDR')}
              fieldId="ceph-cluster-cidr"
              className="odf-install-network__form-group"
            >
              <TextInput
                value={cephClusterCIDR}
                onChange={(_, cidr) => setCephCIDR(cidr)}
                type="text"
                id="ceph-cluster-cidr"
                aria-describedby="ceph-cluster-cidr"
                placeholder={t('Enter a CIDR block (Eg: 192.168.100.0/24)')}
              />
            </FormGroup>
            <FormGroup
              label={t('Ceph Public CIDR')}
              fieldId="ceph-public-cidr"
              className="odf__install-network__form-group"
            >
              <TextInput
                value={cephPublicCIDR}
                onChange={(_, cidr) => setPublicCIDR(cidr)}
                type="text"
                id="ceph-public-cidr"
                aria-describedby="ceph-public-cidr"
                placeholder={t('Enter a CIDR block (Eg: 192.168.0.0/32)')}
              />
            </FormGroup>
          </Form>
        </>
      )}
    </>
  );
};
