import * as React from 'react';
import { NetworkAttachmentDefinitionModel } from '@odf/core/models';
import TechPreviewBadge from '@odf/shared/badges/TechPreviewBadge';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { getName, getUID } from '@odf/shared/selectors';
import { NetworkAttachmentDefinitionKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  ResourceIcon,
  WatchK8sResults,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import { SelectOption } from '@patternfly/react-core/deprecated';
import * as _ from 'lodash-es';
import { FormGroup, Radio } from '@patternfly/react-core';
import { NetworkType, NADSelectorType } from '../../../../types';
import { WizardState } from '../../reducer';
import './configure.scss';

const resources = (ns: string) => ({
  openshift: {
    isList: true,
    kind: referenceForModel(NetworkAttachmentDefinitionModel),
    namespace: ns,
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
});

type MultusWatchResourcesObject = {
  multus: NetworkAttachmentDefinitionKind[];
  openshift: NetworkAttachmentDefinitionKind[];
  default: NetworkAttachmentDefinitionKind[];
};

const k8sToSelectResourceMapper = (
  item: NetworkAttachmentDefinitionKind
): JSX.Element => {
  const uid = getUID(item);
  return (
    <SelectOption id={getName(item)} key={uid} value={uid}>
      <ResourceIcon
        groupVersionKind={{
          group: NetworkAttachmentDefinitionModel.apiGroup,
          version: NetworkAttachmentDefinitionModel.apiVersion,
          kind: NetworkAttachmentDefinitionModel.kind,
        }}
      />
      {getName(item)}
    </SelectOption>
  );
};

const reduceResourceLoadAndErrorStatus = <
  T extends keyof MultusWatchResourcesObject
>(
  acc: { loaded: boolean; error: any },
  curr: WatchK8sResults<MultusWatchResourcesObject>[T]
) => {
  const loadValue = curr.loaded && acc.loaded;
  const errorValue = curr.loadError || acc.error;
  return { loaded: loadValue, error: errorValue };
};

export const MultusDropdown: React.FC<MultusDropdownProps> = ({
  setNetwork,
  clusterNetwork,
  publicNetwork,
  systemNamespace,
}) => {
  const { t } = useCustomTranslation();

  const clusterNetworkUID = getUID(clusterNetwork);
  const publicNetworkUID = getUID(publicNetwork);

  const networkResources = useK8sWatchResources(resources(systemNamespace));

  const networkDevices: K8sResourceCommon[] = React.useMemo(() => {
    const { loaded: resourcesLoaded, error: resourcesLoadError } =
      Object.values(networkResources).reduce(reduceResourceLoadAndErrorStatus, {
        loaded: true,
        error: null,
      });

    if (resourcesLoaded && !resourcesLoadError) {
      const devices = _.flatMap(
        Object.values(networkResources),
        (res) => res.data
      );
      return devices;
    }
    return [];
  }, [networkResources]);

  const memoizedNetworkDevices = useDeepCompareMemoize(networkDevices, true);

  const selectOptions: JSX.Element[] = React.useMemo(
    () => memoizedNetworkDevices.map(k8sToSelectResourceMapper),
    [memoizedNetworkDevices]
  );

  const filter = React.useCallback(
    (_unused, textInput: string) => {
      if (!textInput) {
        return selectOptions;
      } else {
        return selectOptions.filter((item) =>
          (item.props.id as string).toLowerCase().includes(textInput)
        );
      }
    },
    [selectOptions]
  );

  const onSelectPublicNetwork = React.useCallback(
    (uid: string) => {
      if (!(uid === publicNetworkUID)) {
        const resource = memoizedNetworkDevices.find(
          (res) => getUID(res) === uid
        );
        setNetwork(NADSelectorType.PUBLIC, resource);
      } else {
        setNetwork(NADSelectorType.PUBLIC, null);
      }
    },
    [memoizedNetworkDevices, setNetwork, publicNetworkUID]
  );

  const onSelectClusterNetwork = React.useCallback(
    (uid: string) => {
      if (!(uid === clusterNetworkUID)) {
        const resource = memoizedNetworkDevices.find(
          (res) => getUID(res) === uid
        );
        setNetwork(NADSelectorType.CLUSTER, resource);
      } else {
        setNetwork(NADSelectorType.CLUSTER, null);
      }
    },
    [memoizedNetworkDevices, setNetwork, clusterNetworkUID]
  );

  return (
    <>
      <FormGroup
        fieldId="configure-multus-public"
        label={t('Public Network Interface')}
      >
        <SingleSelectDropdown
          onChange={onSelectPublicNetwork}
          selectOptions={selectOptions}
          selectedKey={publicNetworkUID}
          className="ceph__multus-dropdown"
          placeholderText={t('Select NetworkAttachmentDefinition')}
          onFilter={filter}
          hasInlineFilter
        />
      </FormGroup>
      <FormGroup
        fieldId="configure-multus-cluster"
        label={t('Cluster Network Interface')}
      >
        <SingleSelectDropdown
          onChange={onSelectClusterNetwork}
          selectOptions={selectOptions}
          selectedKey={clusterNetworkUID}
          className="ceph__multus-dropdown"
          placeholderText={t('Select NetworkAttachmentDefinition')}
          onFilter={filter}
          hasInlineFilter
        />
      </FormGroup>
    </>
  );
};

type MultusDropdownProps = {
  setNetwork: (type: NADSelectorType, resource: K8sResourceCommon) => void;
  clusterNetwork: NetworkAttachmentDefinitionKind;
  publicNetwork: NetworkAttachmentDefinitionKind;
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
};

export const NetworkFormGroup: React.FC<NetworkFormGroupProps> = ({
  setNetworkType,
  networkType,
  setNetwork,
  clusterNetwork,
  publicNetwork,
  systemNamespace,
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
              {t('Default (OVN)')}
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
          systemNamespace={systemNamespace}
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
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
};
