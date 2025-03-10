import { getName, ACMManagedClusterViewModel } from '@odf/shared';
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
import { ACMManagedClusterViewKind } from '../types';

export const deleteManagedClusterView = (
  viewName: string,
  clusterName: string
) =>
  k8sDelete({
    model: ACMManagedClusterViewModel,
    resource: { metadata: { name: viewName, namespace: clusterName } },
  }).catch((err) => {
    if (!(err instanceof NotFoundError) || !isNotFoundError(err)) throw err;
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

export const fireManagedClusterView = async (
  resourceName: string,
  resourceNamespace: string,
  resourceKind: string,
  resourceApiVersion: string,
  resourceApiGroup: string,
  clusterName: string,
  t: TFunction
): Promise<PollManagedClusterViewResult> => {
  const res = await k8sCreate<ACMManagedClusterViewKind>({
    model: ACMManagedClusterViewModel,
    data: {
      apiVersion: getAPIVersionForModel(ACMManagedClusterViewModel),
      kind: ACMManagedClusterViewModel.kind,
      metadata: { generateName: 'mcv-', namespace: clusterName },
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
  });

  return pollManagedClusterView(getName(res), clusterName, t);
};

export const pollManagedClusterView = (
  viewName: string,
  clusterName: string,
  t: TFunction
): Promise<PollManagedClusterViewResult> => {
  const MAX_RETRIES = 20;
  const TIMEOUT_MS = 500;

  return new Promise((resolve, reject) => {
    const poll = async (retries: number) => {
      try {
        const response = await getManagedClusterView(viewName, clusterName);

        if (response?.status) {
          const {
            type: isProcessing,
            reason,
            message: viewMessage,
          } = response.status.conditions?.[0] || {};

          if (
            isProcessing === 'Processing' &&
            reason === 'GetResourceProcessing'
          ) {
            await deleteManagedClusterView(viewName, clusterName);

            return resolve({
              processing: isProcessing,
              reason: reason,
              result: response.status?.result,
              message: viewMessage,
            });
          }

          if (isProcessing === 'Processing') {
            await deleteManagedClusterView(viewName, clusterName);

            return reject(
              new Error(viewMessage || t('View did not complete successfully.'))
            );
          }

          await deleteManagedClusterView(viewName, clusterName);

          return reject(
            new Error(
              'There was an error while getting the managed resource. Make sure the managed cluster is online and healthy, and the work manager pod in namespace open-cluster-management-agent-addon is healthy.'
            )
          );
        }

        if (retries < MAX_RETRIES) {
          setTimeout(poll, TIMEOUT_MS, ++retries);
        } else {
          await deleteManagedClusterView(viewName, clusterName);

          reject(
            new Error(
              t(
                'Request for ManagedClusterView {{viewName}} on cluster {{clusterName}} timed out after too many retries. Make sure the work manager pod in namespace open-cluster-management-agent-addon is healthy.',
                {
                  viewName,
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
              'An unexpected error occurred while polling for ManagedClusterView: {{error}}',
              { error }
            )
          )
        );
      }
    };

    poll(1);
  });
};

type PollManagedClusterViewResult = {
  processing: string;
  reason: string;
  result: K8sResourceCommon;
  message: string;
};
