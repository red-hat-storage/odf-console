import * as React from 'react';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
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
import './configure.scss';

export const NetworkFormGroup: React.FC<NetworkFormGroupProps> = ({
  setNetworkType,
  networkType,
  setMultusNetwork,
  clusterNetwork,
  publicNetwork,
  systemNamespace,
  isMultusAcknowledged,
  setIsMultusAcknowledged,
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
            label={
              <>
                {t('Default (Pod)')}
                <FieldLevelHelp>
                  {t(
                    'The default OVN uses a single network for all data operations such as read/write and also for control planes, such as data replication.'
                  )}
                </FieldLevelHelp>
              </>
            }
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
            isChecked={networkType === NetworkType.HOST}
            name="custom-network"
            label={
              <div className="ceph__multus-radio--width">
                {t('Host')}
                <FieldLevelHelp>
                  {t(
                    'Multus allows a network seperation between the data operations and the control plane operations.'
                  )}
                </FieldLevelHelp>
              </div>
            }
            onChange={() => setNetworkType(NetworkType.HOST)}
            value={NetworkType.MULTUS}
            id={NetworkType.MULTUS}
          />
        )}
      </FormGroup>
      {(networkType === NetworkType.MULTUS ||
        networkType === NetworkType.DEFAULT) && (
        <MultusNetworkConfigurationComponent
          setNetwork={setMultusNetwork}
          clusterNetwork={clusterNetwork}
          publicNetwork={publicNetwork}
          systemNamespace={systemNamespace}
          setNetworkType={(type: NetworkType) => setNetworkType(type)}
          networkType={networkType}
          isMultusAcknowledged={isMultusAcknowledged}
          setIsMultusAcknowledged={setIsMultusAcknowledged}
        />
      )}
    </>
  );
};

type NetworkFormGroupProps = {
  setNetworkType: any;
  networkType: NetworkType;
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
};
