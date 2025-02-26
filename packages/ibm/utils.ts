import { SecretKind } from '@odf/shared/types';
import * as _ from 'lodash-es';
import { IBMFlashSystemKind } from './system-types';

export const isIPRegistered = (address, registeredIPs) => {
  return registeredIPs?.includes(address);
};

export const getSecretManagementAddress = <A extends SecretKind = SecretKind>(
  value: A
) =>
  _.get(
    value,
    'data.management_address'
  ) as SecretKind['data']['management_address'];

export const getFlashSystemSecretName = <
  A extends IBMFlashSystemKind = IBMFlashSystemKind,
>(
  value: A
) =>
  _.get(
    value,
    'spec.secret.name'
  ) as IBMFlashSystemKind['spec']['secret']['name'];
