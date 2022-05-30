import {
  OwnerReference,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import { ClusterServiceVersionModel } from '../models';
import { ClusterServiceVersionKind } from '../types/console-types';
import { groupVersionFor } from '.';

const isOwnedByOperator = (
  csv: ClusterServiceVersionKind,
  owner: OwnerReference
) => {
  const { group } = groupVersionFor(owner.apiVersion);
  return csv.spec?.customresourcedefinitions?.owned?.some((owned) => {
    const ownedGroup = owned.name.substring(owned.name.indexOf('.') + 1);
    return owned.kind === owner.kind && ownedGroup === group;
  });
};

const isOwnedByCSV = (
  csv: ClusterServiceVersionKind,
  owner: OwnerReference
) => {
  const { group } = groupVersionFor(owner.apiVersion);
  return (
    group === ClusterServiceVersionModel.apiGroup &&
    owner.kind === ClusterServiceVersionModel.kind &&
    csv.metadata.name === owner.name
  );
};

export const findOwner = (
  obj: K8sResourceCommon,
  csvs: ClusterServiceVersionKind[]
) => {
  return obj?.metadata?.ownerReferences?.find((o) =>
    csvs?.some((csv) => isOwnedByOperator(csv, o) || isOwnedByCSV(csv, o))
  );
};
