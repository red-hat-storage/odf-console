import * as React from 'react';
import { TFunction } from 'react-i18next';
import { Trans } from 'react-i18next';

export const requestedCapacityTooltip = (t: TFunction) =>
  t(
    'plugin__odf-console~The amount of capacity that would be dynamically allocated on the selected StorageClass.'
  );

export const storageClassTooltip = (t: TFunction) =>
  t(
    'plugin__odf-console~The StorageClass used by Data Foundation to write its data and metadata.'
  );

export const arbiterText = (t: TFunction) =>
  t(
    'plugin__odf-console~If you wish to use the Arbiter stretch cluster, a minimum of 4 nodes (2 different zones, 2 nodes per zone) and 1 additional zone with 1 node is required. All nodes must be pre-labeled with zones in order to be validated on cluster creation.'
  );

export const attachDevices = (t: TFunction, scName: string) => {
  return (
    <Trans t={t} ns="plugin__odf-console">
      Selected nodes are based on the StorageClass <em>{{ scName }}</em> and
      with a recommended requirement of 14 CPU and 34 GiB RAM per node.
    </Trans>
  );
};

export const attachDevicesWithArbiter = (t: TFunction, scName: string) => {
  return (
    <Trans t={t} ns="plugin__odf-console">
      Selected nodes are based on the StorageClass <em>{{ scName }}</em> and
      fulfill the stretch cluster requirements with a recommended requirement of
      14 CPU and 34 GiB RAM per node.
    </Trans>
  );
};

export const externalStorageCapacityUsed = (t: TFunction) => {
  return (
    <Trans t={t} ns="plugin__odf-console">
      Storage capacity utilised from the external object storage provider.
    </Trans>
  );
};

export const storageCapacityTooltip = (t: TFunction) => {
  return (
    <Trans t={t} ns="plugin__odf-console">
      Raw capacity is the absolute total disk space available to the array
      subsystem.
    </Trans>
  );
};

export const resourceProfileTooltip = (t: TFunction) => {
  return (
    <Trans t={t} ns="plugin__odf-console">
      <p className="co-break-word pf-v6-u-font-weight-bold font-size-md pf-v6-u-mb-md">
        What are the different performance profiles I can use to configure
        performance?
      </p>
      <p className="co-break-word pf-v6-u-font-weight-bold pf-v6-u-mb-md">
        Performance profiles types:
      </p>
      <p className="co-break-word pf-v6-u-mb-md">
        <span className="pf-v6-u-font-weight-bold">Balanced mode:</span>{' '}
        Optimized for right amount of CPU and memory resources to support
        diverse workloads.
      </p>
      <p className="co-break-word pf-v6-u-mb-md">
        <span className="pf-v6-u-font-weight-bold">Lean mode:</span> Minimizes
        resource consumption by allocating fewer CPUs and less memory for
        resource-efficient operations.
      </p>
      <p className="co-break-word">
        <span className="pf-v6-u-font-weight-bold">Performance mode:</span>{' '}
        Tailored for high-performance, allocating ample CPUs and memory to
        ensure optimal execution of demanding workloads.
      </p>
    </Trans>
  );
};

export const resourceRequirementsTooltip = (t: TFunction) =>
  t(
    'plugin__odf-console~For enhanced performance of the Data Foundation cluster, the number of CPUs and memory resources are determined based on the cluster environment, size and various other factors.'
  );

export const onboardingTokenTooltip = (t: TFunction) =>
  t(
    'plugin__odf-console~An onboarding token to authenticate and authorize an OpenShift cluster, granting access to the Data Foundation deployment, thus establishing a secure connection.'
  );

export const deviceClassTooltip = (t: TFunction) =>
  t(
    'Multiple device classes are in use. Select the required device class to add capacity.'
  );
