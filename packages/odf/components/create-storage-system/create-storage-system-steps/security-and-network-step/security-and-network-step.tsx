import * as React from 'react';
import { StorageClassWizardStepExtensionProps as ExternalStorage } from '@odf/odf-plugin-sdk/extensions';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import { Form } from '@patternfly/react-core';
import { FEATURES } from '../../../../features';
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
}) => {
  const isMultusSupported = useFlag(FEATURES.OCS_MULTUS);

  const {
    networkType: nwType,
    clusterNetwork,
    publicNetwork,
    encryption,
    kms,
  } = securityAndNetworkState;

  const setNetworkType = (networkType: NetworkType) => {
    dispatch({
      type: 'securityAndNetwork/setNetworkType',
      payload: networkType,
    });
    if (networkType === NetworkType.DEFAULT) {
      dispatch({ type: 'securityAndNetwork/setClusterNetwork', payload: null });
      dispatch({ type: 'securityAndNetwork/setPublicNetwork', payload: null });
    }
  };

  const setNetwork = React.useCallback(
    (network: NADSelectorType, resource: K8sResourceCommon) =>
      dispatch({
        type:
          network === NADSelectorType.CLUSTER
            ? 'securityAndNetwork/setClusterNetwork'
            : 'securityAndNetwork/setPublicNetwork',
        payload: resource,
      }),
    [dispatch]
  );

  return (
    <Form noValidate={false}>
      <Encryption
        encryption={encryption}
        kms={kms}
        dispatch={dispatch}
        infraType={infraType}
        isExternal={isExternal}
      />
      {!isExternal && isMultusSupported && (
        <NetworkFormGroup
          networkType={nwType}
          setNetworkType={setNetworkType}
          setNetwork={setNetwork}
          clusterNetwork={clusterNetwork}
          publicNetwork={publicNetwork}
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
  securityAndNetworkState: WizardState['securityAndNetwork'];
  dispatch: WizardDispatch;
  infraType: string;
  isExternal?: boolean;
  connectionDetailState?: WizardState['connectionDetails'];
  externalStorage?: WizardState['backingStorage']['externalStorage'];
  supportedExternalStorage?: ExternalStorage[];
};
