import { getGroupFromApiVersion } from '@odf/shared/utils';
import { NotFoundError } from '@odf/shared/utils/error/http-error';
import {
  getAPIVersionForModel,
  k8sCreate,
  k8sDelete,
  k8sGet,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { ACMManagedClusterActionModel } from '../models';
import {
  ACMManagedClusterActionKind,
  ManagedClusterActionType,
} from '../types';

const deleteManagedClusterAction = (actionName: string, clusterName: string) =>
  k8sDelete({
    model: ACMManagedClusterActionModel,
    resource: { metadata: { name: actionName, namespace: clusterName } },
  }).catch((err) => {
    if (err instanceof NotFoundError && err.message !== 'NotFound') throw err;
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

export const fireManagedClusterAction = (
  actionType: ManagedClusterActionType,
  clusterName: string,
  resourceKind: string,
  resourceApiVersion: string,
  resourceName: string,
  resourceNamespace: string,
  resourceBody: any,
  t: TFunction
): Promise<PollManagedClusterActionResult> => {
  const actionName = uuidv4();

  const { apiGroup, version } = getGroupFromApiVersion(resourceApiVersion);
  const resourceType = apiGroup
    ? `${resourceKind.toLowerCase()}.${version}.${apiGroup}`
    : resourceKind.toLowerCase();

  return k8sCreate({
    model: ACMManagedClusterActionModel,
    data: {
      apiVersion: getAPIVersionForModel(ACMManagedClusterActionModel),
      kind: ACMManagedClusterActionModel.kind,
      metadata: { name: actionName, namespace: clusterName },
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
  }).then(() => pollManagedClusterAction(actionName, clusterName, t));
};

export const pollManagedClusterAction = (
  actionName: string,
  clusterName: string,
  t: TFunction
): Promise<PollManagedClusterActionResult> => {
  let retries = process.env.NODE_ENV === 'development' ? 0 : 20;

  return new Promise((resolve, reject) => {
    const poll = () => {
      getManagedClusterAction(actionName, clusterName)
        .then((response) => {
          if (response?.status) {
            const {
              type: isComplete,
              reason: isActionDone,
              message: actionMessage,
            } = response.status.conditions?.[0] || {};

            if (isComplete === 'Completed') {
              if (isActionDone === 'ActionDone') {
                resolve({
                  complete: isComplete,
                  actionDone: isActionDone,
                  result: response.status?.result,
                });
              } else {
                reject(
                  new Error(
                    actionMessage || t('Action did not complete successfully.')
                  )
                );
              }
            } else {
              reject(
                new Error(
                  t(
                    'There was an error while performing the managed cluster resource action. Ensure the cluster is online and the work manager pod in namespace open-cluster-management-agent-addon is healthy.'
                  )
                )
              );
            }

            deleteManagedClusterAction(actionName, clusterName);
          } else if (retries-- > 0) {
            setTimeout(poll, 100);
          } else {
            deleteManagedClusterAction(actionName, clusterName);
            reject(
              new Error(
                t(
                  'Request for ManagedClusterAction {{actionName}} on cluster {{clusterName}} failed due to too many retries. Ensure the work manager pod in open-cluster-management-agent-addon is healthy.',
                  { actionName, clusterName }
                )
              )
            );
          }
        })
        .catch((error) => {
          reject(
            new Error(
              t(
                'An unexpected error occurred while polling for ManagedClusterAction. Reason: {{error}}',
                { error }
              )
            )
          );
        });
    };

    poll();
  });
};

type PollManagedClusterActionResult = {
  complete: string;
  actionDone: string;
  result: K8sResourceCommon;
};
