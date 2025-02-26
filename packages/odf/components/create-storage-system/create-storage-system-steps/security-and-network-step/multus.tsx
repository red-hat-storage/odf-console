import * as React from 'react';
import { NetworkAttachmentDefinitionModel } from '@odf/core/models';
import { NetworkType, NADSelectorType } from '@odf/core/types';
import {
  getName,
  getUID,
  NetworkAttachmentDefinitionKind,
  SingleSelectDropdown,
  useCustomTranslation,
  useDeepCompareMemoize,
} from '@odf/shared';
import { referenceForModel } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  ResourceIcon,
  useK8sWatchResources,
  WatchK8sResults,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Checkbox, FormGroup, SelectOption } from '@patternfly/react-core';
import { WizardState } from '../../reducer';

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

type MultusNetworkConfigurationComponentProps = {
  setNetworkType: any;
  networkType: NetworkType;
  setNetwork: (type: NADSelectorType, resource: K8sResourceCommon) => void;
  clusterNetwork: NetworkAttachmentDefinitionKind;
  publicNetwork: NetworkAttachmentDefinitionKind;
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
};

const reduceResourceLoadAndErrorStatus = <
  T extends keyof MultusWatchResourcesObject,
>(
  acc: { loaded: boolean; error: any },
  curr: WatchK8sResults<MultusWatchResourcesObject>[T]
) => {
  const loadValue = curr.loaded && acc.loaded;
  const errorValue = curr.loadError || acc.error;
  return { loaded: loadValue, error: errorValue };
};
type MultusDropdownProps = {
  setNetwork: (type: NADSelectorType, resource: K8sResourceCommon) => void;
  clusterNetwork: NetworkAttachmentDefinitionKind;
  publicNetwork: NetworkAttachmentDefinitionKind;
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
};

export const MultusNetworkConfigurationComponent: React.FC<
  MultusNetworkConfigurationComponentProps
> = ({
  setNetworkType,
  setNetwork,
  clusterNetwork,
  publicNetwork,
  networkType,
  systemNamespace,
}) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <Checkbox
        isChecked={networkType === NetworkType.MULTUS}
        onChange={() =>
          setNetworkType(
            networkType === NetworkType.DEFAULT
              ? NetworkType.MULTUS
              : NetworkType.DEFAULT
          )
        }
        label={t('Isolate network using Multus')}
        description={t(
          'Multus allows a network seperation between the data operations and the control plane operations.'
        )}
        id="multus-checkbox"
      />
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
