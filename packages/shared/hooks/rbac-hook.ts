import * as React from 'react';
import {
  k8sCreate,
  K8sVerb,
  SelfSubjectAccessReviewKind,
  AccessReviewResourceAttributes,
  useSafetyFirst,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash';
import { ProjectModel, SelfSubjectAccessReviewModel } from '../models';

/**
 * Memoizes the result so it is possible to only make the request once for each access review.
 * This does mean that the user will have to refresh the page to see updates.
 * Function takes in the destructured resource attributes so that the cache keys are stable.
 * `JSON.stringify` is not guaranteed to give the same result for equivalent objects.
 * Impersonate headers are added automatically by `k8sCreate`.
 * @param group resource group.
 * @param resource resource string.
 * @param subresource subresource string.
 * @param verb K8s verb.
 * @param namespace namespace.
 * @returns Memoized result of the access review.
 */
const checkAccessInternal = _.memoize(
  (
    group: string,
    resource: string,
    subresource: string,
    verb: K8sVerb,
    name: string,
    namespace: string,
    cluster?: string
  ): Promise<SelfSubjectAccessReviewKind> => {
    // Projects are a special case. `namespace` must be set to the project name
    // even though it's a cluster-scoped resource.
    const reviewNamespace =
      group === ProjectModel.apiGroup && resource === ProjectModel.plural
        ? name
        : namespace;
    const ssar: SelfSubjectAccessReviewKind = {
      apiVersion: 'authorization.k8s.io/v1',
      kind: 'SelfSubjectAccessReview',
      spec: {
        resourceAttributes: {
          group,
          resource,
          subresource,
          verb,
          name,
          namespace: reviewNamespace,
        },
      },
    };
    return k8sCreate({
      model: SelfSubjectAccessReviewModel,
      data: ssar,
      ...(!!cluster ? { cluster } : {}),
    });
  },
  (...args) => [...args].join('~')
);

/**
 * Hook that provides information about user access to a given resource.
 * @param resourceAttributes resource attributes for access review
 * @param impersonate impersonation details
 * @returns Array with isAllowed and loading values.
 */
export const useAccessReview = (
  resourceAttributes: AccessReviewResourceAttributes,
  cluster?: string
): [boolean, boolean] => {
  const [loading, setLoading] = useSafetyFirst(true);
  const [isAllowed, setAllowed] = useSafetyFirst(false);
  // Destructure the attributes to pass them as dependencies to `useEffect`,
  // which doesn't do deep comparison of object dependencies.
  const {
    group = '',
    resource = '',
    subresource = '',
    verb = '' as K8sVerb,
    name = '',
    namespace = '',
  } = resourceAttributes;
  React.useEffect(() => {
    checkAccessInternal(
      group,
      resource,
      subresource,
      verb,
      name,
      namespace,
      cluster
    )
      .then((result: SelfSubjectAccessReviewKind) => {
        setAllowed(result.status.allowed);
        setLoading(false);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.warn('SelfSubjectAccessReview failed', e);
        // Default to enabling the action if the access review fails so that we
        // don't incorrectly block users from actions they can perform. The server
        // still enforces access control.
        setAllowed(true);
        setLoading(false);
      });
  }, [
    setLoading,
    setAllowed,
    group,
    resource,
    subresource,
    verb,
    name,
    namespace,
    cluster,
  ]);

  return [isAllowed, loading];
};
