import { Taint } from '@odf/shared/types';
import { TFunction } from 'i18next';

export const ODF_OPERATOR = 'odf-operator';
export const NO_PROVISIONER = 'kubernetes.io/no-provisioner';
export const OCS_DEVICE_SET_REPLICA = 3;
export const OCS_DEVICE_SET_ARBITER_REPLICA = 4;
export const MINIMUM_NODES = 3;

export enum defaultRequestSize {
    BAREMETAL = '1',
    NON_BAREMETAL = '2Ti',
}

export const requestedCapacityTooltip = (t: TFunction) =>
    t(
        'plugin__odf-console~The amount of capacity that would be dynamically allocated on the selected StorageClass.',
    );

export const storageClassTooltip = (t: TFunction) =>
    t(
        'plugin__odf-console~The StorageClass used by OpenShift Data Foundation to write its data and metadata.',
    );

export const OCS_PROVISIONERS = [
    'ceph.rook.io/block',
    'cephfs.csi.ceph.com',
    'rbd.csi.ceph.com',
    'noobaa.io/obc',
    'ceph.rook.io/bucket',
];

export const HOSTNAME_LABEL_KEY = 'kubernetes.io/hostname';
export const LABEL_OPERATOR = 'In';

export const ZONE_LABELS = [
    'topology.kubernetes.io/zone',
    'failure-domain.beta.kubernetes.io/zone', // deprecated
];

export const ocsTaint: Taint = Object.freeze({
    key: 'node.ocs.openshift.io/storage',
    value: 'true',
    effect: 'NoSchedule',
});

export const RACK_LABEL = 'topology.rook.io/rack';

export const OSD_CAPACITY_SIZES = {
    '512Gi': 0.5,
    '2Ti': 2,
    '4Ti': 4,
};
