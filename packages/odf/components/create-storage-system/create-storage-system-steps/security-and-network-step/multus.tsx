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
import { flatMap } from 'lodash-es';
import {
  Alert,
  AlertVariant,
  Checkbox,
  FormGroup,
  SelectOption,
} from '@patternfly/react-core';
import { WizardState } from '../../reducer';
import './multus.scss';

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
  const handleMultusToggle = (_, checked) => {
    setNetworkType(checked ? NetworkType.MULTUS : NetworkType.DEFAULT);
    if (!checked) {
      setIsMultusAcknowledged(false);
    }
  };

  const handleAcknowledgementChange = (_, checked) => {
    setIsMultusAcknowledged(checked);
  };

  return (
    <div className="odf-multus-configuration">
      {/* Network Section */}
      <h2 className="odf-section-header">{t('Network')}</h2>
      <Alert
        data-test="odf-default-network-alert"
        className="odf-alert odf-mb-md"
        title={t('Data Foundation will use the default pod network')}
        variant={AlertVariant.info}
        isInline
      >
        {t(
          'If you require a custom network configuration, you can modify the network settings after deployment.'
        )}
      </Alert>

      {/* Isolate Network Section */}
      <h2 className="odf-section-header odf-mt-lg">{t('Isolate Network')}</h2>
      <div className="odf-indented-section">
        <Checkbox
          isChecked={networkType === NetworkType.MULTUS}
          onChange={handleMultusToggle}
          label={t('Isolate network using Multus')}
          description={t(
            'Multus allows a network separation between the data operations and the control plane operations.'
          )}
          id="multus-checkbox"
          className="odf-mb-md"
        />

        {networkType === NetworkType.MULTUS && (
          <>
            <Alert
              variant={AlertVariant.warning}
              isInline
              title={t('Network Isolation Requirements')}
              className="odf-alert odf-mb-md"
            >
              <div className="odf-alert-content">
                <p className="odf-mb-sm">
                  {t(
                    'This will isolate network to attach additional clusters as external clients. Run Validation test before to proceed further.'
                  )}
                </p>
                <p className="odf-mb-sm">
                  {t(
                    'Set up Multus by following relevant steps in KCS. Incorrectly setting up Multus might lead to:'
                  )}
                </p>
                <ul className="odf-bullet-list">
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
                    {t('PVC mounting failures for ODF-dependent workloads')}
                  </li>
                </ul>
              </div>
            </Alert>

            <div className="odf-indented-section">
              <Checkbox
                isChecked={isMultusAcknowledged}
                label={t(
                  'By checking this box, you acknowledge running the validation test'
                )}
                onChange={handleAcknowledgementChange}
                id="acknowledgment-checkbox"
                className="odf-mb-md"
              />
            </div>

            {isMultusAcknowledged && (
              <div className="odf-indented-section">
                <MultusDropdown
                  setNetwork={setNetwork}
                  clusterNetwork={clusterNetwork}
                  publicNetwork={publicNetwork}
                  systemNamespace={systemNamespace}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
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
      const devices = flatMap(
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
