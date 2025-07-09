import * as React from 'react';
import { NetworkType, NADSelectorType } from '@odf/core/types';
import { NetworkAttachmentDefinitionModel } from '@odf/shared';
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
import { SelectOption } from '@patternfly/react-core/deprecated';
import * as _ from 'lodash-es';
import {
  Alert,
  AlertVariant,
  Checkbox,
  FormGroup,
} from '@patternfly/react-core';
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
  isMultusAcknowledged: boolean;
  setIsMultusAcknowledged: (val: boolean) => void;
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
  isMultusAcknowledged,
  setIsMultusAcknowledged,
}) => {
  const { t } = useCustomTranslation();

  const handleMultusToggle = (_event: any, checked: any) => {
    if (checked) {
      setNetworkType(NetworkType.MULTUS);
    } else {
      setNetworkType(NetworkType.DEFAULT);
      setIsMultusAcknowledged(false);
    }
  };

  const handleAcknowledgementChange = (_event: any, checked: boolean) => {
    setIsMultusAcknowledged(checked);
  };

  return (
    <>
      <FormGroup fieldId="network-alert">
        <Alert
          data-test="odf-default-network-alert"
          title={t('Data Foundation will use the default pod network')}
          variant={AlertVariant.info}
          isInline
        >
          {t(
            'If you require a custom network configuration, you can modify the network settings after deployment.'
          )}
        </Alert>
      </FormGroup>
      <FormGroup fieldId="isoloate-network" label={t('Isolate Network')}>
        <Checkbox
          isChecked={networkType === NetworkType.MULTUS}
          onChange={handleMultusToggle}
          label={t('Isolate network using Multus')}
          id="multus-checkbox"
          className="pf-v5-u-mb-md"
        />

        {networkType === NetworkType.MULTUS && (
          <>
            <Alert
              className="pf-v5-u-ml-md"
              variant={AlertVariant.warning}
              isInline
              title={t(
                'This will isolate network to attach additional clusters as external clients. Run Validation test before to proceed further.'
              )}
            >
              <p>
                {t(
                  'Set up Multus by following relevant steps in KCS. Incorrectly setting up Multus might lead to:'
                )}
              </p>
              <ul>
                <li>
                  {t(
                    'Data unavailability or loss due to broken internal communication'
                  )}
                </li>
                <li>
                  {t(
                    'Cluster health issues if network attachments are misconfigured'
                  )}
                </li>
                <li>
                  {t(
                    'PVC mounting failures for Data Foundation dependent workloads'
                  )}
                </li>
              </ul>
            </Alert>

            <Checkbox
              isChecked={isMultusAcknowledged}
              label={t(
                'By checking this box, you acknowledge running the validation test'
              )}
              onChange={handleAcknowledgementChange}
              id="acknowledgment-checkbox"
              className="pf-v5-u-ml-md"
            />
          </>
        )}
      </FormGroup>
      {isMultusAcknowledged && (
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
          id="multus-public-network-dropdown"
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
          id="multus-cluster-network-dropdown"
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
