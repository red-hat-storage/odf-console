import * as _ from 'lodash-es';
import { CEPH_PROVISIONERS } from './constants';

export const isCephProvisioner = (scProvisioner: string): boolean => {
  return CEPH_PROVISIONERS.some((provisioner: string) =>
    _.endsWith(scProvisioner, provisioner)
  );
};
