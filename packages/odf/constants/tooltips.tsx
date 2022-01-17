import * as React from 'react';
import { TFunction } from 'i18next';
import { Trans } from 'react-i18next';

export const requestedCapacityTooltip = (t: TFunction) =>
    t(
        'plugin__odf-console~The amount of capacity that would be dynamically allocated on the selected StorageClass.',
    );

export const storageClassTooltip = (t: TFunction) =>
    t(
        'plugin__odf-console~The StorageClass used by OpenShift Data Foundation to write its data and metadata.',
    );

export const arbiterText = (t: TFunction) =>
    t(
      'plugin__odf-console~If you wish to use the Arbiter stretch cluster, a minimum of 4 nodes (2 different zones, 2 nodes per zone) and 1 additional zone with 1 node is required. All nodes must be pre-labeled with zones in order to be validated on cluster creation.',
    );

export const attachDevices = (t: TFunction, scName: string) => {
    return (
        <Trans t={t} ns="plugin__odf-console">
        Selected nodes are based on the StorageClass <em>{{ scName }}</em> and with a recommended
        requirement of 14 CPU and 34 GiB RAM per node.
        </Trans>
    );
};

export const attachDevicesWithArbiter = (t: TFunction, scName: string) => {
    return (
        <Trans t={t} ns="plugin__odf-console">
        Selected nodes are based on the StorageClass <em>{{ scName }}</em> and fulfill the stretch
        cluster requirements with a recommended requirement of 14 CPU and 34 GiB RAM per node.
        </Trans>
    );
};
