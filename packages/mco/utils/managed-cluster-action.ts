import { ACMManagedClusterActionModel, getName } from '@odf/shared';
import { findCondition, isConditionStatus } from '@odf/shared/selectors';
import { K8sResourceConditionStatus } from '@odf/shared/types';
import { isNotFoundError } from '@odf/shared/utils';
import { NotFoundError } from '@odf/shared/utils/error/http-error';
import {
  getAPIVersionForModel,
  k8sCreate,
  k8sDelete,
  k8sGet,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import {
  ACMManagedClusterActionKind,
  ManagedClusterActionConditionReason,
  ManagedClusterActionConditionType,
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
          const completedCondition = findCondition(
            response.status.conditions,
            ManagedClusterActionConditionType.Completed
          );
          const isComplete = isConditionStatus(
            completedCondition,
            K8sResourceConditionStatus.True
          );
          const reason = completedCondition?.reason;
          const actionMessage = completedCondition?.message;

          if (
            isComplete &&
            reason === ManagedClusterActionConditionReason.ActionDone
          ) {
            await deleteManagedClusterAction(actionName, clusterName);

            return resolve({
              complete: ManagedClusterActionConditionType.Completed,
              actionDone: reason,
              result: response.status?.result,
            });
          }

          // Completed reported True with a non-success reason — terminal failure.
          // Missing / not-True Completed: keep polling until timeout.
          if (isComplete) {
            await deleteManagedClusterAction(actionName, clusterName);

            return reject(
              new Error(
                actionMessage || t('Action did not complete successfully.')
              )
            );
          }
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
