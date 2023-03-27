import * as React from 'react';
import {
  createWizardNodeState,
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
import { FEATURES } from '@odf/core/features';
import { pvResource, nodeResource } from '@odf/core/resources';
import { NodesPerZoneMap } from '@odf/core/types';
import { getSCAvailablePVs, getAssociatedNodes } from '@odf/core/utils';
import { calcPVsCapacity } from '@odf/core/utils';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { K8sResourceKind, NodeKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import { Trans } from 'react-i18next';
import {
  Checkbox,
  Grid,
  GridItem,
  Form,
  FormGroup,
  Text,
  Label,
  TextVariants,
  TextContent,
  TextInput,
} from '@patternfly/react-core';
import { ValidationMessage } from '../../../utils/common-odf-install-el';
import { ErrorHandler } from '../../error-handler';
import { WizardDispatch, WizardNodeState, WizardState } from '../../reducer';
import { SelectNodesTable } from '../../select-nodes-table/select-nodes-table';
import { SelectedNodesTable } from './selected-nodes-table';
import { StretchCluster } from './stretch-cluster';
import './capacity-and-nodes.scss';

const SelectNodesText: React.FC<SelectNodesTextProps> = React.memo(
  ({ text }) => {
    const { t } = useCustomTranslation();
    const label = 'cluster.ocs.openshift.io/openshift-storage=""';
    return (
      <TextContent>
        <Text>{text}</Text>
        <Text>
          <Trans t={t as any} ns="plugin__odf-console">
            If not labeled, the selected nodes are labeled{' '}
            <Label color="blue">{{ label }}</Label> to make them target hosts
            for Data Foundation
            {/* eslint-disable react/no-unescaped-entities */}'s components.
          </Trans>
        </Text>
      </TextContent>
    );
  }
);
SelectNodesText.displayName = 'SelectNodesText';

type SelectNodesTextProps = { text: JSX.Element };

const EnableTaintNodes: React.FC<EnableTaintNodesProps> = ({
  dispatch,
  enableTaint,
}) => {
  const { t } = useCustomTranslation();
  const isTaintSupported = useFlag(FEATURES.OCS_TAINT_NODES);

  return isTaintSupported ? (
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
  ) : (
    <></>
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
  enableTaint: WizardState['capacityAndNodes']['enableTaint'];
};

const SelectCapacityAndNodes: React.FC<SelectCapacityAndNodesProps> = ({
  dispatch,
  capacity,
  nodes,
  enableTaint,
}) => {
  const { t } = useCustomTranslation();

  React.useEffect(() => {
    if (!capacity)
      dispatch({ type: 'capacityAndNodes/capacity', payload: '2Ti' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRowSelected = React.useCallback(
    (selectedNodes: NodeKind[]) => {
      const nodesData = createWizardNodeState(selectedNodes);
      dispatch({ type: 'wizard/setNodes', payload: nodesData });
    },
    [dispatch]
  );

  const replicas = getReplicasFromSelectedNodes(nodes);

  return (
    <>
      <TextContent>
        <Text component={TextVariants.h3}>{t('Select capacity')}</Text>
      </TextContent>
      <FormGroup
        fieldId="requested-capacity-dropdown"
        label={t('Requested capacity')}
        labelIcon={
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
      <TextContent>
        <Text id="select-nodes" component={TextVariants.h3}>
          {t('Select nodes')}
        </Text>
      </TextContent>
      <Grid>
        <GridItem span={11}>
          <SelectNodesText
            text={t(
              'Select at least 3 nodes preferably in 3 different zones. It is recommended to start with at least 14 CPUs and 34 GiB per node.'
            )}
          />
        </GridItem>
        <GridItem span={10}>
          <SelectNodesTable nodes={nodes} onRowSelected={onRowSelected} />
        </GridItem>
      </Grid>
      <EnableTaintNodes dispatch={dispatch} enableTaint={enableTaint} />
    </>
  );
};

const SelectedCapacityAndNodes: React.FC<SelectedCapacityAndNodesProps> = ({
  capacity,
  storageClassName,
  enableArbiter,
  enableTaint,
  arbiterLocation,
  dispatch,
  nodes,
}) => {
  const { t } = useCustomTranslation();
  const [pv, pvLoaded, pvLoadError] =
    useK8sWatchResource<K8sResourceKind[]>(pvResource);
  const memoizedPv = useDeepCompareMemoize(pv, true);
  const [allNodes, allNodeLoaded, allNodeLoadError] =
    useK8sWatchResource<NodeKind[]>(nodeResource);
  const memoizedAllNodes = useDeepCompareMemoize(allNodes, true);
  const [hasStrechClusterEnabled, setHasStrechClusterEnabled] =
    React.useState(false);
  const [zones, setZones] = React.useState([]);

  const pvBySc = React.useMemo(
    () => getSCAvailablePVs(memoizedPv, storageClassName),
    [memoizedPv, storageClassName]
  );

  React.useEffect(() => {
    // Updates selected capacity
    if (pvLoaded && !pvLoadError) {
      const pvCapacity = calcPVsCapacity(pvBySc);
      dispatch({
        type: 'capacityAndNodes/capacity',
        payload: pvCapacity,
      });
      dispatch({ type: 'capacityAndNodes/pvCount', payload: pvBySc.length });
    }
  }, [dispatch, pvBySc, pvLoadError, pvLoaded]);

  React.useEffect(() => {
    // Updates selected nodes
    if (
      allNodeLoaded &&
      !allNodeLoadError &&
      memoizedAllNodes.length &&
      pvBySc.length
    ) {
      const pvNodes = getAssociatedNodes(pvBySc);
      const filteredNodes = memoizedAllNodes.filter((node) =>
        pvNodes.includes(node.metadata.name)
      );
      const nodesData = createWizardNodeState(filteredNodes);
      dispatch({ type: 'wizard/setNodes', payload: nodesData });
    }
  }, [dispatch, allNodeLoadError, allNodeLoaded, memoizedAllNodes, pvBySc]);

  React.useEffect(() => {
    // Validates stretch cluster topology
    if (memoizedAllNodes.length && nodes.length) {
      const allZones = getZonesFromNodesKind(memoizedAllNodes);
      const nodesPerZoneMap: NodesPerZoneMap =
        getPVAssociatedNodesPerZone(nodes);
      const isValidStretchCluster = isValidStretchClusterTopology(
        nodesPerZoneMap,
        allZones
      );

      setHasStrechClusterEnabled(isValidStretchCluster);
      setZones(allZones);
    }
  }, [memoizedAllNodes, nodes]);

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
      error={pvLoadError}
      loaded={pvLoaded && !!capacity}
      loadingMessage={t(
        'PersistentVolumes are being provisioned on the selected nodes.'
      )}
      errorMessage={t('Error while loading PersistentVolumes.')}
    >
      <>
        <TextContent>
          <Text component={TextVariants.h3}>{t('Selected capacity')}</Text>
        </TextContent>
        <FormGroup
          fieldId="available-raw-capacity"
          label={t('Available raw capacity')}
        >
          <Grid hasGutter>
            <GridItem span={5}>
              <TextInput
                isReadOnly
                value={humanizeBinaryBytes(capacity).string}
                id="available-raw-capacity"
              />
              <TextContent>
                <Text component={TextVariants.small}>
                  <Trans ns="plugin__odf-console">
                    The available capacity is based on all attached disks
                    associated with the selected{' '}
                    {/* eslint-disable-next-line react/no-unescaped-entities */}
                    StorageClass <b>{{ storageClassName }}</b>
                  </Trans>
                </Text>
              </TextContent>
              <TextContent />
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
        <TextContent>
          <Text id="selected-nodes" component={TextVariants.h3}>
            {t('Selected nodes')}
          </Text>
        </TextContent>
        <Grid>
          <GridItem span={11}>
            <SelectNodesText
              text={
                enableArbiter
                  ? attachDevicesWithArbiter(t, storageClassName)
                  : attachDevices(t, storageClassName)
              }
            />
          </GridItem>
          <GridItem span={10}>
            <SelectedNodesTable data={nodes} />
          </GridItem>
        </Grid>
        <EnableTaintNodes dispatch={dispatch} enableTaint={enableTaint} />
      </>
    </ErrorHandler>
  );
};

type SelectedCapacityAndNodesProps = {
  capacity: WizardState['capacityAndNodes']['capacity'];
  enableArbiter: WizardState['capacityAndNodes']['enableArbiter'];
  enableTaint: WizardState['capacityAndNodes']['enableTaint'];
  storageClassName: string;
  arbiterLocation: WizardState['capacityAndNodes']['arbiterLocation'];
  dispatch: WizardDispatch;
  nodes: WizardNodeState[];
};

export const CapacityAndNodes: React.FC<CapacityAndNodesProps> = ({
  state,
  dispatch,
  storageClass,
  volumeSetName,
  nodes,
}) => {
  const { capacity, enableArbiter, enableTaint, arbiterLocation } = state;

  const isNoProvisioner = storageClass.provisioner === NO_PROVISIONER;
  const validations = capacityAndNodesValidate(
    nodes,
    enableArbiter,
    isNoProvisioner
  );

  return (
    <Form>
      {isNoProvisioner ? (
        <SelectedCapacityAndNodes
          storageClassName={storageClass.name || volumeSetName}
          enableArbiter={enableArbiter}
          arbiterLocation={arbiterLocation}
          enableTaint={enableTaint}
          dispatch={dispatch}
          nodes={nodes}
          capacity={capacity}
        />
      ) : (
        <SelectCapacityAndNodes
          dispatch={dispatch}
          enableTaint={enableTaint}
          capacity={capacity}
          nodes={nodes}
        />
      )}
      {!!validations.length &&
        !!capacity &&
        validations.map((validation) => (
          <ValidationMessage key={validation} validation={validation} />
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
};
