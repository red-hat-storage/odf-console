import { getName, ACMManagedClusterActionModel } from '@odf/shared';
import { isNotFoundError } from '@odf/shared/utils';
import { NotFoundError } from '@odf/shared/utils/error/http-error';
import {
  getAPIVersionForModel,
  k8sCreate,
  k8sDelete,
  k8sGet,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import {
  ACMManagedClusterActionKind,
  ManagedClusterActionType,
} from '../types';

const deleteManagedClusterAction = (actionName: string, clusterName: string) =>
  k8sDelete({
    model: ACMManagedClusterActionModel,
    resource: { metadata: { name: actionName, namespace: clusterName } },
  }).catch((err) => {
    if (!(err instanceof NotFoundError) || !isNotFoundError(err)) throw err;
  });

export const getManagedClusterAction = (
  actionName: string,
  clusterName: string
): Promise<ACMManagedClusterActionKind> =>
  k8sGet({
    model: ACMManagedClusterActionModel,
    name: actionName,
    ns: clusterName,
  });

export const fireManagedClusterAction = async (
  actionType: ManagedClusterActionType,
  clusterName: string,
  resourceKind: string,
  resourceApiGroup: string,
  resourceApiVersion: string,
  resourceName: string,
  resourceNamespace: string,
  resourceBody: any,
  t: TFunction
): Promise<PollManagedClusterActionResult> => {
  const resourceType = `${resourceKind.toLowerCase()}.${resourceApiGroup}.${resourceApiVersion}`;

  const res = await k8sCreate<ACMManagedClusterActionKind>({
    model: ACMManagedClusterActionModel,
    data: {
      apiVersion: getAPIVersionForModel(ACMManagedClusterActionModel),
      kind: ACMManagedClusterActionModel.kind,
      metadata: { generateName: 'mca-', namespace: clusterName },
      spec: {
        cluster: { name: clusterName },
        type: 'Action',
        scope: { resourceType, namespace: resourceNamespace },
        actionType,
        kube: {
          resource: resourceType,
          name: resourceName,
          namespace: resourceNamespace,
          template: resourceBody,
        },
      },
    },
  });

  return pollManagedClusterAction(getName(res), clusterName, t);
};

export const pollManagedClusterAction = (
  actionName: string,
  clusterName: string,
  t: TFunction
): Promise<PollManagedClusterActionResult> => {
  const MAX_RETRIES = 20;
  const TIMEOUT_MS = 500;

  return new Promise((resolve, reject) => {
    const poll = async (retries: number) => {
      try {
        const response = await getManagedClusterAction(actionName, clusterName);

        if (response?.status) {
          const {
            type: isComplete,
            reason: isActionDone,
            message: actionMessage,
          } = response.status.conditions?.[0] || {};

          if (isComplete === 'Completed' && isActionDone === 'ActionDone') {
            await deleteManagedClusterAction(actionName, clusterName);

            return resolve({
              complete: isComplete,
              actionDone: isActionDone,
              result: response.status?.result,
            });
          }

          if (isComplete === 'Completed') {
            await deleteManagedClusterAction(actionName, clusterName);

            return reject(
              new Error(
                actionMessage || t('Action did not complete successfully.')
              )
            );
          }

          await deleteManagedClusterAction(actionName, clusterName);

          return reject(
            new Error(
              'There was an error while performing the managed cluster resource action. Make sure the managed cluster is online and healthy, and that the work manager pod in namespace open-cluster-management-agent-addon is healthy '
            )
          );
        }

        if (retries < MAX_RETRIES) {
          setTimeout(poll, TIMEOUT_MS, ++retries);
        } else {
          await deleteManagedClusterAction(actionName, clusterName);

          reject(
            new Error(
              t(
                'Request for ManagedClusterAction {{actionName}} on cluster {{clusterName}} timed out after too many retries. Ensure the work manager pod in open-cluster-management-agent-addon is healthy.',
                {
                  actionName,
                  clusterName,
                }
              )
            )
          );
        }
      } catch (error) {
        reject(
          new Error(
            t(
              'An unexpected error occurred while polling for ManagedClusterAction: {{error}}',
              { error }
            )
          )
        );
      }
    };

    poll(1);
  });
};

type PollManagedClusterActionResult = {
  complete: string;
  actionDone: string;
  result: K8sResourceCommon;
};
