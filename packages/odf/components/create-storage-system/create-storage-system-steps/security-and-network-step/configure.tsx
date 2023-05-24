import * as React from 'react';
import { NetworkAttachmentDefinitionModel } from '@odf/core/models';
import TechPreviewBadge from '@odf/shared/badges/TechPreviewBadge';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { ResourcesDropdown } from '@odf/shared/dropdown/ResourceDropdown';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { NetworkAttachmentDefinitionKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import * as _ from 'lodash-es';
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
  setNetwork,
  clusterNetwork,
}) => {
  const { t } = useCustomTranslation();

  const onSelectPublicNetwork = React.useCallback(
    (nad: NetworkAttachmentDefinitionKind) => {
      setNetwork(NADSelectorType.PUBLIC, nad);
      if (_.isEmpty(clusterNetwork)) {
        setNetwork(NADSelectorType.CLUSTER, nad);
      }
    },
    [clusterNetwork, setNetwork]
  );

  return (
    <>
      <FormGroup
        fieldId="configure-multus-public"
        label={t('Public Network Interface')}
      >
        <ResourcesDropdown<NetworkAttachmentDefinitionKind>
          resources={resources}
          resourceModel={NetworkAttachmentDefinitionModel}
          className="ceph__multus-dropdown"
          onSelect={onSelectPublicNetwork}
          secondaryTextGenerator={null}
        />
      </FormGroup>
      <FormGroup
        fieldId="configure-multus-cluster"
        label={t('Cluster Network Interface')}
      >
        <ResourcesDropdown<NetworkAttachmentDefinitionKind>
          resources={resources}
          resourceModel={NetworkAttachmentDefinitionModel}
          className="ceph__multus-dropdown"
          onSelect={(selectedResource) =>
            setNetwork(NADSelectorType.CLUSTER, selectedResource)
          }
          selectedResource={clusterNetwork}
          secondaryTextGenerator={null}
        />
      </FormGroup>
    </>
  );
};

type MultusDropdownProps = {
  setNetwork: (type: NADSelectorType, resource: K8sResourceCommon) => void;
  clusterNetwork: NetworkAttachmentDefinitionKind;
  publicNetwork: NetworkAttachmentDefinitionKind;
};

export const NetworkFormGroup: React.FC<NetworkFormGroupProps> = ({
  setNetworkType,
  networkType,
  setNetwork,
  clusterNetwork,
  publicNetwork,
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
          setNetwork={setNetwork}
          clusterNetwork={clusterNetwork}
          publicNetwork={publicNetwork}
        />
      )}
    </>
  );
};

type NetworkFormGroupProps = {
  setNetworkType: any;
  networkType: NetworkType;
  setNetwork: (type: NADSelectorType, resource: K8sResourceCommon) => void;
  clusterNetwork: NetworkAttachmentDefinitionKind;
  publicNetwork: NetworkAttachmentDefinitionKind;
};
