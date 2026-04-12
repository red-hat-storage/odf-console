import * as React from 'react';
import { StorageClassWizardStepExtensionProps as ExternalStorage } from '@odf/odf-plugin-sdk/extensions';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import { Form } from '@patternfly/react-core';
import { NetworkType, NADSelectorType } from '../../../../types';
import { WizardDispatch, WizardState } from '../../reducer';
import { ConnectionDetails } from '../connection-details-step';
import { NetworkFormGroup } from './configure';
import { Encryption } from './encryption';

export const SecurityAndNetwork: React.FC<SecurityAndNetworkProps> = ({
  securityAndNetworkState,
  dispatch,
  infraType,
  isExternal,
  connectionDetailState,
  externalStorage,
  supportedExternalStorage,
  systemNamespace,
  nodes = [],
  isTNFEnabled,
}) => {
  const {
    networkType: nwType,
    clusterNetwork,
    publicNetwork,
    usePublicNetwork,
    useClusterNetwork,
    encryption,
    kms,
    isMultusAcknowledged,
    addressRanges: {
      cluster: [cephClusterCIDR],
      public: [cephPublicCIDR],
    },
  } = securityAndNetworkState;

  const setNetworkType = (networkType: NetworkType) => {
    dispatch({
      type: 'securityAndNetwork/setNetworkType',
      payload: networkType,
    });
    if (networkType !== NetworkType.MULTUS) {
      dispatch({
        type: 'securityAndNetwork/setMultusAcknowledged',
        payload: false,
      });
      dispatch({ type: 'securityAndNetwork/setClusterNetwork', payload: null });
      dispatch({ type: 'securityAndNetwork/setPublicNetwork', payload: null });
    }
  };

  const setMultusNetwork = (
    network: NADSelectorType,
    resource: K8sResourceCommon
  ) =>
    dispatch({
      type:
        network === NADSelectorType.CLUSTER
          ? 'securityAndNetwork/setClusterNetwork'
          : 'securityAndNetwork/setPublicNetwork',
      payload: resource,
    });

  const setCIDRNetwork = React.useCallback(
    (clusterCIDR: string, publicCIDR: string) => {
      const normalizedClusterCIDR = clusterCIDR.trim();
      const normalizedPublicCIDR = publicCIDR.trim();
      dispatch({
        type: 'securityAndNetwork/setCephCIDR',
        payload: normalizedClusterCIDR ? [normalizedClusterCIDR] : [],
      });
      dispatch({
        type: 'securityAndNetwork/setPublicCIDR',
        payload: normalizedPublicCIDR ? [normalizedPublicCIDR] : [],
      });
    },
    [dispatch]
  );

  const setIsMultusAcknowledged = (val: boolean) => {
    dispatch({
      type: 'securityAndNetwork/setMultusAcknowledged',
      payload: val,
    });
  };

  const setUsePublicNetwork = (val: boolean) => {
    dispatch({ type: 'securityAndNetwork/setUsePublicNetwork', payload: val });
  };

  const setUseClusterNetwork = (val: boolean) => {
    dispatch({ type: 'securityAndNetwork/setUseClusterNetwork', payload: val });
  };

  return (
    <Form noValidate={false}>
      <Encryption
        encryption={encryption}
        kms={kms}
        dispatch={dispatch}
        infraType={infraType}
        isExternal={isExternal}
        systemNamespace={systemNamespace}
      />
      {!isExternal && (
        <NetworkFormGroup
          networkType={nwType}
          setNetworkType={setNetworkType}
          setMultusNetwork={setMultusNetwork}
          setCIDRNetwork={setCIDRNetwork}
          cephPublicCIDR={cephPublicCIDR}
          cephClusterCIDR={cephClusterCIDR}
          usePublicNetwork={usePublicNetwork}
          useClusterNetwork={useClusterNetwork}
          setUsePublicNetwork={setUsePublicNetwork}
          setUseClusterNetwork={setUseClusterNetwork}
          clusterNetwork={clusterNetwork}
          publicNetwork={publicNetwork}
          systemNamespace={systemNamespace}
          isMultusAcknowledged={isMultusAcknowledged}
          setIsMultusAcknowledged={setIsMultusAcknowledged}
          nodes={nodes}
          isTNFEnabled={isTNFEnabled}
        />
      )}
      {isExternal && (
        <ConnectionDetails
          state={connectionDetailState}
          dispatch={dispatch}
          externalStorage={externalStorage}
          supportedExternalStorage={supportedExternalStorage}
        />
      )}
    </Form>
  );
};

type SecurityAndNetworkProps = {
  securityAndNetworkState: WizardState['securityAndNetwork'] & {
    isMultusAcknowledged?: boolean;
  };
  dispatch: WizardDispatch;
  infraType: string;
  isExternal?: boolean;
  connectionDetailState?: WizardState['connectionDetails'];
  externalStorage?: WizardState['backingStorage']['externalStorage'];
  supportedExternalStorage?: ExternalStorage[];
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
  nodes?: WizardState['nodes'];
  isTNFEnabled: boolean;
};
