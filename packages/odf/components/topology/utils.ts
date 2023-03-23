import { getName } from '@odf/shared/selectors';
import { NodeDeploymentMap } from '@odf/shared/topology';
import { resolveResourceUntilDeployment } from '@odf/shared/topology/utils/resource';
import { NodeKind, PodKind } from '@odf/shared/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { getRack, getZone } from '../../utils';

export const generateNodeDeploymentsMap = (
  nodes: NodeKind[],
  pods: PodKind[],
  ...resources: K8sResourceCommon[]
): NodeDeploymentMap => {
  return nodes.reduce<NodeDeploymentMap>((map, node) => {
    const podsInNode = pods.filter(
      (pod) => pod.spec.nodeName === getName(node)
    );
    const deploymentsInNode = podsInNode
      .map((pod) =>
        resolveResourceUntilDeployment(
          pod.metadata.ownerReferences[0].uid,
          ...resources
        )
      )
      .filter((item) => item !== null);
    map[getName(node)] = deploymentsInNode;
    return map;
  }, {});
};

export const getTopologyDomain = (node: NodeKind) =>
  getZone(node) || getRack(node);

export const groupNodesByZones = (nodes: NodeKind[]): NodeKind[][] => {
  const groupedNodes = nodes.reduce((acc, curr) => {
    const zone = getTopologyDomain(curr);
    acc[zone] = [...(acc[zone] || []), curr];
    return acc;
  }, {});
  return Object.values(groupedNodes);
};
