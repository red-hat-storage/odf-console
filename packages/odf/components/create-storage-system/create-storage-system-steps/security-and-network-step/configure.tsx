import * as React from 'react';
import { NetworkAttachmentDefinitionKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import * as _ from 'lodash-es';
import { Alert, AlertVariant, FormGroup, Radio } from '@patternfly/react-core';
import { FDF_FLAG } from '../../../../redux';
import { NetworkType, NADSelectorType } from '../../../../types';
import { WizardState } from '../../reducer';
import { MultusNetworkConfigurationComponent } from './multus';
import { NICSelectComponent } from './nic';
import './configure.scss';

export const NetworkFormGroup: React.FC<NetworkFormGroupProps> = ({
  setNetworkType,
  networkType,
  setMultusNetwork,
  setCIDRNetwork,
  cephPublicCIDR,
  cephClusterCIDR,
  usePublicNetwork,
  useClusterNetwork,
  setUsePublicNetwork,
  setUseClusterNetwork,
  clusterNetwork,
  publicNetwork,
  systemNamespace,
  isMultusAcknowledged,
  setIsMultusAcknowledged,
  nodes = [],
  isTNFEnabled,
}) => {
  const { t } = useCustomTranslation();
  const isFDF = useFlag(FDF_FLAG);

  return (
    <>
      <FormGroup
        fieldId="configure-networking"
        label={t('Network')}
        className="ceph__install-radio--inline"
      >
        {isFDF ? (
          <Radio
            isChecked={
              networkType === NetworkType.DEFAULT ||
              networkType === NetworkType.MULTUS
            }
            name="default-network"
            label={t('Default (Pod)')}
            description={t(
              'Use the default OVN network for all internal communication.'
            )}
            onChange={() => setNetworkType(NetworkType.DEFAULT)}
            value={NetworkType.DEFAULT}
            id={NetworkType.DEFAULT}
          />
        ) : (
          <Alert
            data-test="odf-default-network-alert"
            title={t('Data Foundation will use the default pod network.')}
            variant={AlertVariant.info}
            isInline
          />
        )}
        {isFDF && (
          <Radio
            isChecked={
              networkType === NetworkType.HOST ||
              networkType === NetworkType.NIC
            }
            name="custom-network"
            label={t('Host')}
            description={t(
              'Use the host network to allow external access, support custom networking, or connect additional clusters to the storage provider. If no networks are specified, the default network will be used.'
            )}
            onChange={() => setNetworkType(NetworkType.HOST)}
            isDisabled={isTNFEnabled}
            value={NetworkType.MULTUS}
            id={NetworkType.MULTUS}
          />
        )}
      </FormGroup>
      {isFDF &&
        (networkType === NetworkType.DEFAULT ||
          networkType === NetworkType.MULTUS) && (
          <Alert
            data-test="odf-default-network-alert"
            title={t(
              'You cannot (connect or) attach additional cluster to the storage provider.'
            )}
            variant={AlertVariant.info}
            isInline
          />
        )}
      {networkType === NetworkType.MULTUS ||
      networkType === NetworkType.DEFAULT ? (
        <MultusNetworkConfigurationComponent
          setNetwork={setMultusNetwork}
          clusterNetwork={clusterNetwork}
          publicNetwork={publicNetwork}
          systemNamespace={systemNamespace}
          setNetworkType={(type: NetworkType) => setNetworkType(type)}
          networkType={networkType}
          isMultusAcknowledged={isMultusAcknowledged}
          setIsMultusAcknowledged={setIsMultusAcknowledged}
          isTNFEnabled={isTNFEnabled}
        />
      ) : (
        isFDF && (
          <NICSelectComponent
            cephClusterCIDR={cephClusterCIDR ?? ''}
            cephPublicCIDR={cephPublicCIDR ?? ''}
            setCephCIDR={(cephCIDR: string) =>
              setCIDRNetwork(cephCIDR, cephPublicCIDR ?? '')
            }
            setPublicCIDR={(publicCIDR: string) =>
              setCIDRNetwork(cephClusterCIDR ?? '', publicCIDR)
            }
            networkType={networkType}
            setNetworkType={(type: NetworkType) => setNetworkType(type)}
            usePublicNetwork={usePublicNetwork}
            useClusterNetwork={useClusterNetwork}
            setUsePublicNetwork={setUsePublicNetwork}
            setUseClusterNetwork={setUseClusterNetwork}
            nodes={nodes}
          />
        )
      )}
    </>
  );
};

type NetworkFormGroupProps = {
  setNetworkType: any;
  networkType: NetworkType;
  usePublicNetwork: boolean;
  useClusterNetwork: boolean;
  setUsePublicNetwork: (val: boolean) => void;
  setUseClusterNetwork: (val: boolean) => void;
  setMultusNetwork: (
    type: NADSelectorType,
    resource: K8sResourceCommon
  ) => void;
  setCIDRNetwork: (clusterCIDR: string, publicCIDR: string) => void;
  clusterNetwork: NetworkAttachmentDefinitionKind;
  publicNetwork: NetworkAttachmentDefinitionKind;
  cephClusterCIDR: string;
  cephPublicCIDR: string;
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
  isMultusAcknowledged: boolean;
  setIsMultusAcknowledged: (val: boolean) => void;
  nodes?: WizardState['nodes'];
  isTNFEnabled: boolean;
};
