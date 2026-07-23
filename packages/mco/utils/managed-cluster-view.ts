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

const MAX_RETRIES = 20;
const TIMEOUT_MS = 500;

export type PollManagedClusterViewResult = {
  processing: string;
  reason: string;
  result: K8sResourceCommon;
  message: string;
};

export type ManagedClusterViewRequest = {
  promise: Promise<PollManagedClusterViewResult>;
  // Stops polling and deletes the hub MCV (Back / unmount / cluster change).
  cancel: () => void;
};

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

const safeDelete = (viewName: string, clusterName: string) =>
  deleteManagedClusterView(viewName, clusterName).catch(() => {});

// Create + poll with cancel. Prefer this when the caller may unmount mid-flight.
export const startManagedClusterView = async (
  resourceName: string,
  resourceNamespace: string,
  resourceKind: string,
  resourceApiVersion: string,
  resourceApiGroup: string,
  clusterName: string,
  t: TFunction
): Promise<ManagedClusterViewRequest> => {
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

  const viewName = getName(res);
  let settled = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const settle = () => {
    if (settled) {
      return false;
    }
    settled = true;
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    return true;
  };

  const cancel = () => {
    if (!settle()) {
      return;
    }
    // Abandon the promise; callers that cancel must not await it.
    void safeDelete(viewName, clusterName);
  };

  const promise = new Promise<PollManagedClusterViewResult>((resolve, reject) => {
    const poll = async (retries: number) => {
      if (settled) {
        return;
      }

      try {
        const response = await getManagedClusterView(viewName, clusterName);
        if (settled) {
          return;
        }

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
            await safeDelete(viewName, clusterName);
            if (!settle()) {
              return;
            }
            return resolve({
              processing: isProcessing,
              reason: reason,
              result: response.status?.result,
              message: viewMessage,
            });
          }

          if (isProcessing === 'Processing') {
            await safeDelete(viewName, clusterName);
            if (!settle()) {
              return;
            }
            return reject(
              new Error(viewMessage || t('View did not complete successfully.'))
            );
          }

          await safeDelete(viewName, clusterName);
          if (!settle()) {
            return;
          }
          return reject(
            new Error(
              'There was an error while getting the managed resource. Make sure the managed cluster is online and healthy, and the work manager pod in namespace open-cluster-management-agent-addon is healthy.'
            )
          );
        }

        if (retries < MAX_RETRIES) {
          timeoutId = setTimeout(() => {
            if (!settled) {
              poll(retries + 1);
            }
          }, TIMEOUT_MS);
          // Cancel may have run between the settled check and scheduling.
          if (settled) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
          }
          return;
        }

        await safeDelete(viewName, clusterName);
        if (!settle()) {
          return;
        }
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
      } catch (error) {
        if (settled) {
          return;
        }
        await safeDelete(viewName, clusterName);
        if (!settle()) {
          return;
        }
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

  return { promise, cancel };
};

// Backward-compatible fire-and-forget (no cancel). Prefer startManagedClusterView in effects.
export const fireManagedClusterView = async (
  resourceName: string,
  resourceNamespace: string,
  resourceKind: string,
  resourceApiVersion: string,
  resourceApiGroup: string,
  clusterName: string,
  t: TFunction
): Promise<PollManagedClusterViewResult> => {
  const { promise } = await startManagedClusterView(
    resourceName,
    resourceNamespace,
    resourceKind,
    resourceApiVersion,
    resourceApiGroup,
    clusterName,
    t
  );
  return promise;
};
