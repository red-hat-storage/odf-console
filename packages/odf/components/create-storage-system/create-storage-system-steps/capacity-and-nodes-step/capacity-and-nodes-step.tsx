import * as React from 'react';
import {
  createWizardNodeState,
  getDeviceSetReplica,
  getReplicasFromSelectedNodes,
} from '@odf/core/components/utils';
import {
  capacityAndNodesValidate,
  isValidStretchClusterTopology,
  getPVAssociatedNodesPerZone,
  getZonesFromNodesKind,
} from '@odf/core/components/utils';
import {
  OSDSizeDropdown,
  TotalCapacityText,
} from '@odf/core/components/utils/osd-size-dropdown';
import {
  NO_PROVISIONER,
  requestedCapacityTooltip,
  attachDevices,
  attachDevicesWithArbiter,
} from '@odf/core/constants';
import { useNodesData } from '@odf/core/hooks';
import { pvResource } from '@odf/core/resources';
import {
  NodeData,
  NodesPerZoneMap,
  ResourceProfile,
  VolumeTypeValidation,
} from '@odf/core/types';
import {
  calcPVsCapacity,
  getSCAvailablePVs,
  getAssociatedNodes,
  isFlexibleScaling,
  getDeviceSetCount,
  getNodeArchitectureFromState,
  getOsdAmount,
  isCapacityAutoScalingAllowed,
} from '@odf/core/utils';
import { DEFAULT_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { InfraProviders, K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Trans } from 'react-i18next';
import {
  Checkbox,
  Grid,
  GridItem,
  Form,
  FormGroup,
  Content,
  Label,
  ContentVariants,
  TextInput,
} from '@patternfly/react-core';
import { ValidationMessage } from '../../../utils/common-odf-install-el';
import { ErrorHandler } from '../../error-handler';
import { WizardDispatch, WizardNodeState, WizardState } from '../../reducer';
import { SelectNodesTable } from '../../select-nodes-table/select-nodes-table';
import { CapacityAutoScaling } from './capacity-autoscaling';
import ConfigurePerformance, {
  PerformanceHeaderText,
  ProfileRequirementsText,
} from './configure-performance';
import { SelectedNodesTable } from './selected-nodes-table';
import { StretchCluster } from './stretch-cluster';
import { useVolumeTypeValidation } from './useVolumeTypeValidation';
import './capacity-and-nodes.scss';

const onResourceProfileChange = _.curry(
  (dispatch: WizardDispatch, newProfile: ResourceProfile): void => {
    dispatch({
      type: 'capacityAndNodes/setResourceProfile',
      payload: newProfile,
    });
  }
);

const SelectNodesText: React.FC<SelectNodesTextProps> = React.memo(
  ({ text }) => {
    const { t } = useCustomTranslation();

    // ToDo (epic 4422): Use StorageSystem namespace once we support multiple internal clusters
    const label = `cluster.ocs.openshift.io/${DEFAULT_STORAGE_NAMESPACE}=""`;
    return (
      <Content>
        <Content component="p">{text}</Content>
        <Content component="p">
          <Trans t={t as any} ns="plugin__odf-console">
            If not labeled, the selected nodes are labeled{' '}
            <Label color="blue">{{ label }}</Label> to make them target hosts
            for Data Foundation
            {/* eslint-disable react/no-unescaped-entities */}'s components.
          </Trans>
        </Content>
      </Content>
    );
  }
);
SelectNodesText.displayName = 'SelectNodesText';

type SelectNodesTextProps = {
  text: JSX.Element;
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
};

const EnableTaintNodes: React.FC<EnableTaintNodesProps> = ({
  dispatch,
  enableTaint,
}) => {
  const { t } = useCustomTranslation();

  return (
    <Checkbox
      label={t('Taint nodes')}
      description={t(
        'Selected nodes will be dedicated to Data Foundation use only'
      )}
      className="odf-capacity-and-nodes__taint-checkbox"
      id="taint-nodes"
      data-checked-state={enableTaint}
      isChecked={enableTaint}
      onChange={() =>
        dispatch({
          type: 'capacityAndNodes/enableTaint',
          payload: !enableTaint,
        })
      }
    />
  );
};

type EnableTaintNodesProps = {
  dispatch: WizardDispatch;
  enableTaint: WizardState['capacityAndNodes']['enableTaint'];
};

type SelectCapacityAndNodesProps = {
  dispatch: WizardDispatch;
  capacity: WizardState['capacityAndNodes']['capacity'];
  nodes: WizardState['nodes'];
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
};

const SelectCapacityAndNodes: React.FC<SelectCapacityAndNodesProps> = ({
  dispatch,
  capacity,
  nodes,
  systemNamespace,
}) => {
  const { t } = useCustomTranslation();

  React.useEffect(() => {
    if (!capacity)
      dispatch({ type: 'capacityAndNodes/capacity', payload: '2Ti' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRowSelected = React.useCallback(
    (selectedNodes: NodeData[]) => {
      const nodesData = createWizardNodeState(selectedNodes);
      dispatch({ type: 'wizard/setNodes', payload: nodesData });
    },
    [dispatch]
  );

  const replicas = getReplicasFromSelectedNodes(nodes);

  return (
    <>
      <Content>
        <Content component={ContentVariants.h3}>{t('Select capacity')}</Content>
      </Content>
      <FormGroup
        fieldId="requested-capacity-dropdown"
        label={t('Requested capacity')}
        labelHelp={
          <FieldLevelHelp>{requestedCapacityTooltip(t)}</FieldLevelHelp>
        }
      >
        <Grid hasGutter>
          <GridItem span={5}>
            <OSDSizeDropdown
              id="requested-capacity-dropdown"
              selectedKey={capacity as string}
              onChange={(selectedCapacity: string) =>
                dispatch({
                  type: 'capacityAndNodes/capacity',
                  payload: selectedCapacity,
                })
              }
            />
          </GridItem>
          <GridItem span={7}>
            <TotalCapacityText
              capacity={capacity as string}
              replica={replicas}
            />
          </GridItem>
        </Grid>
      </FormGroup>
      <Content>
        <Content id="select-nodes" component={ContentVariants.h3}>
          {t('Select nodes')}
        </Content>
      </Content>
      <Grid>
        <GridItem span={11}>
          <SelectNodesText
            text={t(
              'Select at least 3 nodes preferably in 3 different zones. It is recommended to start with at least 14 CPUs and 34 GiB per node.'
            )}
            systemNamespace={systemNamespace}
          />
        </GridItem>
        <GridItem span={10}>
          <SelectNodesTable
            nodes={nodes}
            onRowSelected={onRowSelected}
            systemNamespace={systemNamespace}
          />
        </GridItem>
      </Grid>
    </>
  );
};

const SelectedCapacityAndNodes: React.FC<SelectedCapacityAndNodesProps> = ({
  capacity,
  storageClassName,
  enableArbiter,
  arbiterLocation,
  volumeValidationType,
  dispatch,
  nodes,
  systemNamespace,
  isLSOPreConfigured,
}) => {
  const { t } = useCustomTranslation();

  const [pvs, pvsLoaded, pvsLoadError] =
    useK8sWatchResource<K8sResourceKind[]>(pvResource);
  const [allNodes, allNodeLoaded, allNodeLoadError] = useNodesData();

  const [hasStrechClusterEnabled, setHasStrechClusterEnabled] =
    React.useState(false);
  const [zones, setZones] = React.useState([]);

  const pvsBySc = React.useMemo(
    () => getSCAvailablePVs(pvs, storageClassName),
    [pvs, storageClassName]
  );

  React.useEffect(() => {
    // Updates selected capacity
    if (pvsLoaded && !pvsLoadError) {
      const pvCapacity = calcPVsCapacity(pvsBySc);
      dispatch({
        type: 'capacityAndNodes/capacity',
        payload: pvCapacity,
      });
      dispatch({ type: 'capacityAndNodes/pvCount', payload: pvsBySc.length });
    }
  }, [dispatch, pvsBySc, pvsLoadError, pvsLoaded]);

  React.useEffect(() => {
    // Updates selected nodes
    if (
      allNodeLoaded &&
      !allNodeLoadError &&
      allNodes.length &&
      pvsBySc.length
    ) {
      const pvNodes = getAssociatedNodes(pvsBySc);
      const filteredNodes = allNodes.filter((node) =>
        pvNodes.includes(node.metadata.name)
      );
      const nodesData = createWizardNodeState(filteredNodes);
      dispatch({ type: 'wizard/setNodes', payload: nodesData });
    }
  }, [dispatch, allNodeLoadError, allNodeLoaded, allNodes, pvsBySc]);

  React.useEffect(() => {
    // Validates stretch cluster topology
    if (allNodes.length && nodes.length) {
      const allZones = getZonesFromNodesKind(allNodes);
      const nodesPerZoneMap: NodesPerZoneMap =
        getPVAssociatedNodesPerZone(nodes);
      const isValidStretchCluster = isValidStretchClusterTopology(
        nodesPerZoneMap,
        allZones
      );

      setHasStrechClusterEnabled(isValidStretchCluster);
      setZones(allZones);
    }
  }, [allNodes, nodes]);

  // Skipping validation if LSO was configured as part of the SS deployment (in the previous LVS creation wizard step), as that step already have all the required validations
  // These validations are needed if LSO was already configured before even starting with the SS deployment
  useVolumeTypeValidation(
    nodes,
    pvsBySc,
    volumeValidationType,
    dispatch,
    isLSOPreConfigured
  );

  const onArbiterChecked = React.useCallback(
    (isChecked: boolean) =>
      dispatch({ type: 'capacityAndNodes/enableArbiter', payload: isChecked }),
    [dispatch]
  );

  const onZonesSelect = React.useCallback(
    (_event, selection: string) =>
      dispatch({
        type: 'capacityAndNodes/arbiterLocation',
        payload: selection,
      }),
    [dispatch]
  );

  return (
    <ErrorHandler
      error={pvsLoadError}
      loaded={
        pvsLoaded &&
        !!capacity &&
        volumeValidationType !== VolumeTypeValidation.UNKNOWN
      }
      loadingMessage={t(
        'PersistentVolumes are being provisioned on the selected nodes.'
      )}
      errorMessage={t('Error while loading PersistentVolumes.')}
    >
      <>
        <Content>
          <Content component={ContentVariants.h3}>
            {t('Selected capacity')}
          </Content>
        </Content>
        <FormGroup
          fieldId="available-raw-capacity"
          label={t('Available raw capacity')}
        >
          <Grid hasGutter>
            <GridItem span={5}>
              <TextInput
                value={humanizeBinaryBytes(capacity).string}
                id="available-raw-capacity"
                readOnlyVariant="default"
              />
              <Content>
                <Content component={ContentVariants.small}>
                  <Trans ns="plugin__odf-console">
                    The available capacity is based on all attached disks
                    associated with the selected{' '}
                    {/* eslint-disable-next-line react/no-unescaped-entities */}
                    StorageClass <b>{{ storageClassName }}</b>
                  </Trans>
                </Content>
              </Content>
              <Content />
            </GridItem>
            <GridItem span={7} />
          </Grid>
        </FormGroup>
        {hasStrechClusterEnabled && (
          <StretchCluster
            enableArbiter={enableArbiter}
            arbiterLocation={arbiterLocation}
            zones={zones}
            onChecked={onArbiterChecked}
            onSelect={onZonesSelect}
          />
        )}
        <Content>
          <Content id="selected-nodes" component={ContentVariants.h3}>
            {t('Selected nodes')}
          </Content>
        </Content>
        <Grid>
          <GridItem span={11}>
            <SelectNodesText
              text={
                enableArbiter
                  ? attachDevicesWithArbiter(t, storageClassName)
                  : attachDevices(t, storageClassName)
              }
              systemNamespace={systemNamespace}
            />
          </GridItem>
          <GridItem span={10}>
            <SelectedNodesTable data={nodes} />
          </GridItem>
        </Grid>
      </>
    </ErrorHandler>
  );
};

type SelectedCapacityAndNodesProps = {
  capacity: WizardState['capacityAndNodes']['capacity'];
  enableArbiter: WizardState['capacityAndNodes']['enableArbiter'];
  storageClassName: string;
  arbiterLocation: WizardState['capacityAndNodes']['arbiterLocation'];
  dispatch: WizardDispatch;
  nodes: WizardNodeState[];
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
  volumeValidationType: VolumeTypeValidation;
  isLSOPreConfigured: boolean;
};

export const CapacityAndNodes: React.FC<CapacityAndNodesProps> = ({
  state,
  dispatch,
  storageClass,
  volumeSetName,
  nodes,
  systemNamespace,
  infraType,
}) => {
  const {
    capacity,
    capacityAutoScaling,
    enableArbiter,
    enableTaint,
    arbiterLocation,
    resourceProfile,
    volumeValidationType,
    pvCount,
  } = state;

  const isNoProvisioner = storageClass.provisioner === NO_PROVISIONER;
  const flexibleScaling = isFlexibleScaling(
    nodes,
    isNoProvisioner,
    enableArbiter
  );
  const deviceSetReplica: number = getDeviceSetReplica(
    enableArbiter,
    flexibleScaling,
    nodes
  );
  const deviceSetCount = getDeviceSetCount(pvCount, deviceSetReplica);
  const osdAmount = getOsdAmount(deviceSetCount, deviceSetReplica);
  const architecture = getNodeArchitectureFromState(nodes);

  const validations = capacityAndNodesValidate(
    nodes,
    state,
    isNoProvisioner,
    osdAmount
  );
  const onProfileChange = React.useCallback(
    (profile) => onResourceProfileChange(dispatch)(profile),
    [dispatch]
  );

  // In case LSO is already configured (before SS deployment), wizard skips LVS creation step (thus, corresponding redux state should be empty)
  const isLSOPreConfigured = !volumeSetName;

  const { capacityLimit, enable: enableAutoScaling } = capacityAutoScaling;
  const onCapacityAutoscalingChange = (_ev, checked: boolean) => {
    dispatch({
      type: 'capacityAndNodes/capacityAutoScaling',
      payload: { capacityLimit, enable: checked },
    });
  };
  const onCapacityAutoscalingSelect = (selected: string) => {
    dispatch({
      type: 'capacityAndNodes/capacityAutoScaling',
      payload: { capacityLimit: selected, enable: enableAutoScaling },
    });
  };
  return (
    <Form>
      {isNoProvisioner ? (
        <SelectedCapacityAndNodes
          storageClassName={storageClass.name || volumeSetName}
          enableArbiter={enableArbiter}
          arbiterLocation={arbiterLocation}
          volumeValidationType={volumeValidationType}
          dispatch={dispatch}
          nodes={nodes}
          capacity={capacity}
          systemNamespace={systemNamespace}
          isLSOPreConfigured={isLSOPreConfigured}
        />
      ) : (
        <SelectCapacityAndNodes
          dispatch={dispatch}
          capacity={capacity}
          nodes={nodes}
          systemNamespace={systemNamespace}
        />
      )}
      {(!isNoProvisioner || nodes.length > 0) && (
        <>
          <ConfigurePerformance
            onResourceProfileChange={onProfileChange}
            resourceProfile={resourceProfile}
            headerText={PerformanceHeaderText}
            profileRequirementsText={ProfileRequirementsText}
            selectedNodes={nodes}
            osdAmount={osdAmount}
          />
          <EnableTaintNodes dispatch={dispatch} enableTaint={enableTaint} />
        </>
      )}
      {isCapacityAutoScalingAllowed(infraType, resourceProfile) && (
        <CapacityAutoScaling
          capacityLimit={capacityLimit}
          className="pf-v6-u-w-75"
          enable={enableAutoScaling}
          onChange={onCapacityAutoscalingChange}
          onLimitSelect={onCapacityAutoscalingSelect}
          osdAmount={osdAmount}
          osdSize={String(capacity)}
        />
      )}
      {!!validations.length &&
        !!capacity &&
        validations.map((validation) => (
          <ValidationMessage
            resourceProfile={resourceProfile}
            volumeValidationType={volumeValidationType}
            osdAmount={osdAmount}
            key={validation}
            validation={validation}
            architecture={architecture}
          />
        ))}
    </Form>
  );
};

type CapacityAndNodesProps = {
  state: WizardState['capacityAndNodes'];
  storageClass: WizardState['storageClass'];
  nodes: WizardState['nodes'];
  volumeSetName: WizardState['createLocalVolumeSet']['volumeSetName'];
  dispatch: WizardDispatch;
  infraType: InfraProviders;
  systemNamespace: WizardState['backingStorage']['systemNamespace'];
};
