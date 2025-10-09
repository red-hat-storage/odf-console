import { DeploymentModel } from '@odf/shared/models';
import { getUID } from '@odf/shared/selectors';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { DeploymentKind } from '../../types';

export const resolveResourceUntilDeployment = (
  ownerUID: string,
  ...resources: K8sResourceCommon[]
): DeploymentKind => {
  const owner = resources.find((res) => getUID(res) === ownerUID);
  if (!owner) {
    return null;
  }
  if (owner.kind === DeploymentModel.kind) {
    return owner as DeploymentKind;
  } else {
    return resolveResourceUntilDeployment(
      owner?.metadata?.ownerReferences?.[0]?.uid,
      ...resources
    );
  }
};
