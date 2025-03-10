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
import { ACMManagedClusterViewModel } from '../models';
import { ACMManagedClusterViewKind } from '../types';

export const deleteManagedClusterView = (
  viewName: string,
  clusterName: string
) =>
  k8sDelete({
    model: ACMManagedClusterViewModel,
    resource: { metadata: { name: viewName, namespace: clusterName } },
  }).catch((err) => {
    if (err instanceof NotFoundError && err.message !== 'NotFound') throw err;
  });

export const getManagedClusterView = (
  viewName: string,
  clusterName: string
): Promise<ACMManagedClusterViewKind> =>
  k8sGet({
    model: ACMManagedClusterViewModel,
    name: viewName,
    ns: clusterName,
  });

export const pollManagedClusterView = (
  viewName: string,
  clusterName: string,
  t: TFunction
): Promise<PollManagedClusterViewResult> => {
  let retries = process.env.NODE_ENV === 'development' ? 0 : 20;

  return new Promise((resolve, reject) => {
    const poll = () => {
      getManagedClusterView(viewName, clusterName)
        .then((response) => {
          if (response?.status) {
            const {
              type: isProcessing,
              reason,
              message: viewMessage,
            } = response.status.conditions?.[0] || {};

            if (isProcessing === 'Processing') {
              if (reason === 'GetResourceProcessing') {
                resolve({
                  processing: isProcessing,
                  reason: reason,
                  result: response.status?.result,
                  message: viewMessage,
                });
              } else {
                reject(
                  new Error(
                    viewMessage || t('Action did not complete successfully.')
                  )
                );
              }
            } else {
              reject(
                new Error(
                  t(
                    'There was an error while performing the managed cluster view. Ensure the cluster is online and the work manager pod in namespace open-cluster-management-agent-addon is healthy.'
                  )
                )
              );
            }

            deleteManagedClusterView(viewName, clusterName);
          } else if (retries-- > 0) {
            setTimeout(poll, 100);
          } else {
            deleteManagedClusterView(viewName, clusterName);
            reject(
              new Error(
                t(
                  'Request for ManagedClusterView {{viewName}} on cluster {{clusterName}} failed due to too many retries. Ensure the work manager pod in open-cluster-management-agent-addon is healthy.',
                  { viewName, clusterName }
                )
              )
            );
          }
        })
        .catch((error) => {
          reject(
            new Error(
              t(
                'An unexpected error occurred while polling for ManagedClusterView. Reason: {{error}}',
                { error }
              )
            )
          );
        });
    };

    poll();
  });
};

export const fireManagedClusterView = async (
  resourceName: string,
  resourceNamespace: string,
  resourceKind: string,
  resourceApiVersion: string,
  resourceApiGroup: string,
  clusterName: string,
  t: TFunction
): Promise<PollManagedClusterViewResult> => {
  const viewName = uuidv4();

  return k8sCreate({
    model: ACMManagedClusterViewModel,
    data: {
      apiVersion: getAPIVersionForModel(ACMManagedClusterViewModel),
      kind: ACMManagedClusterViewModel.kind,
      metadata: { name: viewName, namespace: clusterName },
      spec: {
        scope: {
          name: resourceName,
          namespace: resourceNamespace,
          kind: resourceKind,
          apiGroup: resourceApiGroup,
          version: resourceApiVersion,
        },
      },
    },
  }).then(() => pollManagedClusterView(viewName, clusterName, t));
};

type PollManagedClusterViewResult = {
  processing: string;
  reason: string;
  result: K8sResourceCommon;
  message: string;
};
