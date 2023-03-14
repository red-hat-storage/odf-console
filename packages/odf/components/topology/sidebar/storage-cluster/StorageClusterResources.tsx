import * as React from 'react';
import { CEPH_STORAGE_LABEL } from '@odf/core/constants';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import { DeploymentModel, NodeModel } from '@odf/shared/models';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { getUID } from '@odf/shared/selectors';
import { nodeStatus } from '@odf/shared/status/Node';
import { Status } from '@odf/shared/status/Status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { resourcePathFromModel } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  ResourceStatus,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { DeploymentKind, NodeKind } from 'packages/shared/types';
import { Title } from '@patternfly/react-core';
import '@odf/shared/topology/sidebar/common/resources-tab.scss';

const watchResources = {
  nodes: {
    isList: true,
    kind: NodeModel.kind,
    selector: {
      matchLabels: { [CEPH_STORAGE_LABEL]: '' },
    },
  },
  deployments: {
    isList: true,
    kind: DeploymentModel.kind,
    namespace: CEPH_STORAGE_NAMESPACE,
    namespaced: true,
  },
};

type NodeOverviewItemProps = {
  node: NodeKind;
};

const NodeOverviewItem: React.FC<NodeOverviewItemProps> = ({ node }) => {
  const {
    metadata: { name, namespace },
  } = node;

  return (
    <li className="list-group-item container-fluid">
      <div className="row">
        <span className="col-xs-8">
          <ResourceLink
            link={resourcePathFromModel(NodeModel, name, namespace)}
            resourceModel={NodeModel}
            resourceName={name}
          />
        </span>
        <span className="col-xs-4">
          <ResourceStatus additionalClassNames="hidden-xs">
            <Status status={nodeStatus(node)} />
          </ResourceStatus>
        </span>
      </div>
    </li>
  );
};

type DeploymentOverviewItemProps = {
  deployment: DeploymentKind;
};

const DeploymentOverviewItem: React.FC<DeploymentOverviewItemProps> = ({
  deployment,
}) => {
  const {
    metadata: { name, namespace },
  } = deployment;

  return (
    <li className="list-group-item container-fluid">
      <div className="row">
        <span className="col-xs-8">
          <ResourceLink
            link={resourcePathFromModel(DeploymentModel, name, namespace)}
            resourceModel={DeploymentModel}
            resourceName={name}
          />
        </span>
        <span className="col-xs-4">
          {deployment.status.availableReplicas ===
            deployment.status.updatedReplicas &&
          deployment.spec.replicas === deployment.status.availableReplicas ? (
            <Status status="Up to date" />
          ) : (
            <Status status="Updating" />
          )}
        </span>
      </div>
    </li>
  );
};

type NodeOverviewListProps = {
  nodes: NodeKind[];
};

const NodesOverviewList: React.FC<NodeOverviewListProps> = ({ nodes }) => (
  <ul className="list-group">
    {_.map(nodes, (node) => (
      <NodeOverviewItem key={getUID(node)} node={node} />
    ))}
  </ul>
);

type DeploymentOverviewListProps = {
  deployments: DeploymentKind[];
};

const DeploymentOverviewList: React.FC<DeploymentOverviewListProps> = ({
  deployments,
}) => (
  <ul className="list-group">
    {_.map(deployments, (deployment) => (
      <DeploymentOverviewItem
        key={getUID(deployment)}
        deployment={deployment}
      />
    ))}
  </ul>
);

export const StorageClusterResources: React.FC<{
  resource?: K8sResourceCommon;
}> = () => {
  const { t } = useCustomTranslation();
  const clusterResources = useK8sWatchResources(watchResources);

  const nodes = (clusterResources?.nodes?.data ?? []) as NodeKind[];
  const nodesLoaded = clusterResources?.nodes?.loaded;
  const nodesLoadError = clusterResources?.nodes?.loadError;

  const deployments = (clusterResources?.deployments?.data ??
    []) as DeploymentKind[];
  const deploymentsLoaded = clusterResources?.deployments?.loaded;
  const deploymentsLoadError = clusterResources?.deployments?.loadError;

  return (
    <>
      <div className="odf-m-pane__body topology-sidebar-tab__resources">
        {nodesLoaded && _.isEmpty(nodesLoadError) ? (
          <>
            <Title headingLevel="h3">
              {t('Nodes')} ({nodes.length})
            </Title>
            {nodes.length > 0 && <NodesOverviewList nodes={nodes} />}
          </>
        ) : (
          <DataUnavailableError />
        )}
      </div>
      <div className="odf-m-pane__body topology-sidebar-tab__resources">
        {deploymentsLoaded && _.isEmpty(deploymentsLoadError) ? (
          <>
            <Title headingLevel="h3">
              {t('Deployments')} ({deployments.length})
            </Title>
            {deployments.length > 0 && (
              <DeploymentOverviewList deployments={deployments} />
            )}
          </>
        ) : (
          <DataUnavailableError />
        )}
      </div>
    </>
  );
};
