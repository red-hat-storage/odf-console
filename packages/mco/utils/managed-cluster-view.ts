import { ACMManagedClusterViewModel, getName } from '@odf/shared';
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
  ACMManagedClusterViewKind,
  ManagedClusterViewConditionReason,
  ManagedClusterViewConditionType,
} from '../types';

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
  deleteManagedClusterView(viewName, clusterName).catch(() => undefined);

export type ManagedClusterViewScope = {
  name: string;
  namespace: string;
  kind: string;
  version: string;
  group: string;
};

// Create + poll with cancel. Prefer this when the caller may unmount mid-flight.
export const startManagedClusterView = async (
  scope: ManagedClusterViewScope,
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
          name: scope.name,
          namespace: scope.namespace,
          kind: scope.kind,
          apiGroup: scope.group,
          version: scope.version,
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
    safeDelete(viewName, clusterName);
  };

  const promise = new Promise<PollManagedClusterViewResult>(
    (resolve, reject) => {
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
            const processingCondition = findCondition(
              response.status.conditions,
              ManagedClusterViewConditionType.Processing
            );
            const isProcessing = isConditionStatus(
              processingCondition,
              K8sResourceConditionStatus.True
            );
            const reason = processingCondition?.reason;
            const viewMessage = processingCondition?.message;

            if (
              isProcessing &&
              reason === ManagedClusterViewConditionReason.GetResourceProcessing
            ) {
              await safeDelete(viewName, clusterName);
              if (!settle()) {
                return;
              }
              return resolve({
                processing: ManagedClusterViewConditionType.Processing,
                reason,
                result: response.status?.result,
                message: viewMessage,
              });
            }

            // Processing reported True with a non-success reason — terminal failure.
            // Missing / not-True Processing: keep polling until timeout.
            if (isProcessing) {
              await safeDelete(viewName, clusterName);
              if (!settle()) {
                return;
              }
              return reject(
                new Error(
                  viewMessage || t('View did not complete successfully.')
                )
              );
            }
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
    }
  );

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
    {
      name: resourceName,
      namespace: resourceNamespace,
      kind: resourceKind,
      version: resourceApiVersion,
      group: resourceApiGroup,
    },
    clusterName,
    t
  );
  return promise;
};
