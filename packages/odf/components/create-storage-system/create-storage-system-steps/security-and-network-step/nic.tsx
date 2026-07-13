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
import { isValidCIDRFormat } from '../../../utils/cidr-utils';
import './nic.scss';

type NICSelectComponentProps = {
  cephClusterCIDR: string;
  setCephCIDR: (cidr: string) => void;
  networkType: NetworkType;
  setNetworkType: (networkType: NetworkType) => void;
  useClusterNetwork: boolean;
  setUseClusterNetwork: (val: boolean) => void;
  nodes?: {
    annotations?: Record<string, string>;
    metadata?: { annotations?: Record<string, string> };
  }[];
};

export const NICSelectComponent: React.FC<NICSelectComponentProps> = ({
  cephClusterCIDR,
  setCephCIDR,
  networkType,
  setNetworkType,
  useClusterNetwork,
  setUseClusterNetwork,
  nodes = [],
}) => {
  const { t } = useCustomTranslation();

  const isIsolateCephNetwork = networkType === NetworkType.NIC;

  const handleIsolateCephChange = (checked: boolean) => {
    setNetworkType(checked ? NetworkType.NIC : NetworkType.HOST);
  };

  const clusterCidrValidFormat = isValidCIDRFormat(cephClusterCIDR);
  const clusterCidrValid = useClusterNetwork && clusterCidrValidFormat;
  const clusterCidrError =
    useClusterNetwork &&
    cephClusterCIDR.trim() &&
    !clusterCidrValidFormat &&
    t('Must use CIDR notation. Eg: 192.168.200.0/24');

  return (
    <>
      <Checkbox
        isChecked={isIsolateCephNetwork}
        onChange={(_, checked) => handleIsolateCephChange(!!checked)}
        label={t('Isolate Ceph network')}
        id="isolate-ceph-network"
        description={t(
          'Specify the cluster network interface that Ceph will use for data traffic.'
        )}
      />
      {isIsolateCephNetwork && (
        <div className="pf-v6-u-ml-lg pf-v6-u-mt-md">
          <Checkbox
            isChecked={useClusterNetwork}
            onChange={(_, checked) => setUseClusterNetwork(!!checked)}
            label={t('Use cluster network')}
            id="use-cluster-network"
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
