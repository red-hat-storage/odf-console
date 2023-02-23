import { DeploymentModel } from '@odf/shared/models';
import { getName, getUID } from '@odf/shared/selectors';
import { NodeDeploymentMap } from '@odf/shared/topology';
import { NodeKind, PodKind } from '@odf/shared/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { getZone } from '../../utils';

const resolveResourceUntilDeployment = (
  ownerUID: string,
  ...resources: K8sResourceCommon[]
) => {
  const owner = resources.find((res) => getUID(res) === ownerUID);
  if (!owner) {
    return null;
  }
  if (owner.kind === DeploymentModel.kind) {
    return owner;
  } else {
    return resolveResourceUntilDeployment(
      owner.metadata.ownerReferences[0].uid,
      ...resources
    );
  }
};

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

export const groupNodesByZones = (nodes: NodeKind[]): NodeKind[][] => {
  const groupedNodes = nodes.reduce((acc, curr) => {
    const zone = getZone(curr);
    acc[zone] = [...(acc[zone] || []), curr];
    return acc;
  }, {});
  return Object.values(groupedNodes);
};
