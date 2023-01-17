import * as React from 'react';
import { NetworkAttachmentDefinitionModel } from '@odf/core/models';
import TechPreviewBadge from '@odf/shared/badges/TechPreviewBadge';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { ResourcesDropdown } from '@odf/shared/dropdown/ResourceDropdown';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { getName } from '@odf/shared/selectors';
import { NetworkAttachmentDefinitionKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import { FormGroup, Radio } from '@patternfly/react-core';
import { NetworkType, NADSelectorType } from '../../../../types';
import './configure.scss';

const resources = {
  openshift: {
    isList: true,
    kind: referenceForModel(NetworkAttachmentDefinitionModel),
    namespace: CEPH_STORAGE_NAMESPACE,
    namespaced: true,
  },
  default: {
    isList: true,
    kind: referenceForModel(NetworkAttachmentDefinitionModel),
    namespace: 'default',
    namespaced: true,
  },
  multus: {
    isList: true,
    kind: referenceForModel(NetworkAttachmentDefinitionModel),
    namespace: 'openshift-multus',
    namespaced: true,
  },
};

export const MultusDropdown: React.FC<MultusDropdownProps> = ({
  publicNetwork,
  clusterNetwork,
  setNetwork,
}) => {
  const { t } = useCustomTranslation();

  const filterForPublicDevices = React.useCallback(
    (device: NetworkAttachmentDefinitionKind) =>
      clusterNetwork?.split('/')?.[1] !== getName(device),
    [clusterNetwork]
  );
  const filterForClusterDevices = React.useCallback(
    (device: NetworkAttachmentDefinitionKind) =>
      publicNetwork?.split('/')?.[1] !== getName(device),
    [publicNetwork]
  );

  return (
    <>
      <FormGroup
        fieldId="configure-multus-public"
        label={t('Public Network Interface')}
      >
        <ResourcesDropdown
          resources={resources}
          resourceModel={NetworkAttachmentDefinitionModel}
          className="ceph__multus-dropdown"
          onSelect={(selectedResource) =>
            setNetwork(NADSelectorType.PUBLIC, selectedResource)
          }
          secondaryTextGenerator={null}
          filterResource={filterForPublicDevices}
        />
      </FormGroup>
      <FormGroup
        fieldId="configure-multus-cluster"
        label={t('Cluster Network Interface')}
      >
        <ResourcesDropdown
          resources={resources}
          resourceModel={NetworkAttachmentDefinitionModel}
          className="ceph__multus-dropdown"
          onSelect={(selectedResource) =>
            setNetwork(NADSelectorType.CLUSTER, selectedResource)
          }
          secondaryTextGenerator={null}
          filterResource={filterForClusterDevices}
        />
      </FormGroup>
    </>
  );
};

type MultusDropdownProps = {
  publicNetwork: string;
  clusterNetwork: string;
  setNetwork: (type: NADSelectorType, resource: K8sResourceCommon) => void;
};

export const NetworkFormGroup: React.FC<NetworkFormGroupProps> = ({
  setNetworkType,
  networkType,
  publicNetwork,
  clusterNetwork,
  setNetwork,
}) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <FormGroup
        fieldId="configure-networking"
        label={t('Network')}
        className="ceph__install-radio--inline"
      >
        <Radio
          isChecked={networkType === NetworkType.DEFAULT}
          name="default-network"
          label={
            <>
              {t('Default (SDN)')}
              <FieldLevelHelp>
                {t(
                  'The default SDN uses a single network for all data operations such as read/write and also for control planes, such as data replication.'
                )}
              </FieldLevelHelp>
            </>
          }
          onChange={() => setNetworkType(NetworkType.DEFAULT)}
          value={NetworkType.DEFAULT}
          id={NetworkType.DEFAULT}
        />
        <Radio
          isChecked={networkType === NetworkType.MULTUS}
          name="custom-network"
          label={
            <>
              {t('Custom (Multus)')}
              <FieldLevelHelp>
                {t(
                  'Multus allows a network seperation between the data operations and the control plane operations.'
                )}
              </FieldLevelHelp>
            </>
          }
          onChange={() => setNetworkType(NetworkType.MULTUS)}
          value={NetworkType.MULTUS}
          id={NetworkType.MULTUS}
        />
        <div className="ceph__multus-tech-preview-badge--margin">
          <TechPreviewBadge />
        </div>
      </FormGroup>
      {networkType === NetworkType.MULTUS && (
        <MultusDropdown
          publicNetwork={publicNetwork}
          clusterNetwork={clusterNetwork}
          setNetwork={setNetwork}
        />
      )}
    </>
  );
};

type NetworkFormGroupProps = {
  setNetworkType: any;
  networkType: NetworkType;
  publicNetwork: string;
  clusterNetwork: string;
  setNetwork: (type: NADSelectorType, resource: K8sResourceCommon) => void;
};
