import * as React from 'react';
import { ClusterServiceVersionModel } from '@odf/shared/models';
import { Status } from '@odf/shared/status/Status';
import { HumanizeResult, RowFunctionArgs } from '@odf/shared/types';
import {
  humanizeBinaryBytes,
  humanizeDecimalBytesPerSec,
  humanizeIOPS,
  humanizeLatency,
} from '@odf/shared/utils';
import {
  referenceForGroupVersionKind,
  referenceForModel,
  getGVK,
} from '@odf/shared/utils';
import {
  FirehoseResourcesResult,
  PrometheusResponse,
} from '@openshift-console/dynamic-plugin-sdk';
import { usePrometheusPoll } from '@openshift-console/dynamic-plugin-sdk-internal';
import {
  Kebab,
  ResourceKebab,
  TableData,
  Table,
  ListPage,
} from '@openshift-console/dynamic-plugin-sdk-internal-kubevirt';
import { PrometheusEndpoint } from '@openshift-console/dynamic-plugin-sdk-internal/lib/api/internal-types';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router';
import { sortable, wrappable } from '@patternfly/react-table';
import { CEPH_STORAGE_NAMESPACE } from '../../constants';
import { ODFStorageSystem } from '../../models';
import { ODF_QUERIES, ODFQueries } from '../../queries';
import { StorageSystemKind } from '../../types';
import { OperandStatus } from './status';
import ODFSystemLink from './system-link';
import { getActions } from './utils';

type SystemMetrics = {
  [systeName: string]: {
    rawCapacity: HumanizeResult;
    usedCapacity: HumanizeResult;
    iops: HumanizeResult;
    throughput: HumanizeResult;
    latency: HumanizeResult;
  };
};

type MetricNormalize = (
  systems: StorageSystemKind[],
  latency: PrometheusResponse,
  throughput: PrometheusResponse,
  rawCapacity: PrometheusResponse,
  usedCapacity: PrometheusResponse,
  iops: PrometheusResponse
) => SystemMetrics;

export const normalizeMetrics: MetricNormalize = (
  systems,
  latency,
  throughput,
  rawCapacity,
  usedCapacity,
  iops
) => {
  if (
    _.isEmpty(systems) ||
    !latency ||
    !throughput ||
    !rawCapacity ||
    !usedCapacity ||
    !iops
  ) {
    return {};
  }
  return systems.reduce<SystemMetrics>((acc, curr) => {
    acc[curr.metadata.name] = {
      rawCapacity: humanizeBinaryBytes(
        rawCapacity.data.result.find(
          (item) => item?.metric?.managedBy === curr.spec.name
        )?.value?.[1]
      ),
      usedCapacity: humanizeBinaryBytes(
        usedCapacity.data.result.find(
          (item) => item?.metric?.managedBy === curr.spec.name
        )?.value?.[1]
      ),
      iops: humanizeIOPS(
        iops.data.result.find(
          (item) => item?.metric?.managedBy === curr.spec.name
        )?.value?.[1]
      ),
      throughput: humanizeDecimalBytesPerSec(
        throughput.data.result.find(
          (item) => item?.metric?.managedBy === curr.spec.name
        )?.value?.[1]
      ),
      latency: humanizeLatency(
        latency.data.result.find(
          (item) => item?.metric?.managedBy === curr.spec.name
        )?.value?.[1]
      ),
    };
    return acc;
  }, {});
};

const tableColumnClasses = [
  'pf-u-w-15-on-xl',
  'pf-m-hidden pf-m-visible-on-md pf-u-w-12-on-xl',
  'pf-m-hidden pf-m-visible-on-lg pf-u-w-12-on-xl',
  'pf-m-hidden pf-m-visible-on-lg pf-u-w-12-on-xl',
  'pf-m-hidden pf-m-visible-on-lg pf-u-w-12-on-xl',
  'pf-m-hidden pf-m-visible-on-lg pf-u-w-12-on-xl',
  'pf-m-hidden pf-m-visible-on-lg pf-u-w-12-on-xl',
  Kebab.columnClass,
];

type CustomData = {
  normalizedMetrics: ReturnType<typeof normalizeMetrics>;
};

const SystemTableRow: React.FC<RowFunctionArgs<StorageSystemKind, CustomData>> =
  ({ obj, customData }) => {
    const { t } = useTranslation('plugin__odf-console');
    const { apiGroup, apiVersion, kind } = getGVK(obj.spec.kind);
    const systemKind = referenceForGroupVersionKind(apiGroup)(apiVersion)(kind);
    const systemName = obj?.metadata?.name;
    const { normalizedMetrics } = customData;

    const { rawCapacity, usedCapacity, iops, throughput, latency } =
      normalizedMetrics?.[systemName] || {};

    return (
      <>
        <TableData className={tableColumnClasses[0]}>
          <ODFSystemLink
            kind={systemKind}
            systemName={systemName}
            providerName={systemName}
          />
        </TableData>
        <TableData className={tableColumnClasses[1]}>
          {obj?.metadata?.deletionTimestamp ? (
            <Status status="Terminating" />
          ) : (
            <OperandStatus operand={obj} />
          )}
        </TableData>
        <TableData className={tableColumnClasses[2]}>
          {rawCapacity?.string || '-'}
        </TableData>
        <TableData className={tableColumnClasses[3]}>
          {usedCapacity?.string || '-'}
        </TableData>
        <TableData className={tableColumnClasses[4]}>
          {iops?.string || '-'}
        </TableData>
        <TableData className={tableColumnClasses[5]}>
          {throughput?.string || '-'}
        </TableData>
        <TableData className={tableColumnClasses[6]}>
          {latency?.string || '-'}
        </TableData>
        <TableData className={tableColumnClasses[7]}>
          <ResourceKebab
            actions={getActions(systemKind)}
            resource={obj}
            kind={referenceForModel(ODFStorageSystem)}
            customData={{ tFunction: t }}
          />
        </TableData>
      </>
    );
  };

const StorageSystemList: React.FC<StorageSystemListProps> = (props) => {
  const { t } = useTranslation('plugin__odf-console');
  const Header = () => {
    return [
      {
        title: t('Name'),
        sortField: 'metadata.name',
        transforms: [sortable, wrappable],
        props: { className: tableColumnClasses[0] },
      },
      {
        title: t('Status'),
        transforms: [wrappable],
        props: { className: tableColumnClasses[1] },
      },
      {
        title: t('Raw Capacity'),
        transforms: [wrappable],
        props: { className: tableColumnClasses[2] },
      },
      {
        title: t('Used capacity'),
        transforms: [wrappable],
        props: { className: tableColumnClasses[3] },
      },
      {
        title: t('IOPS'),
        transforms: [wrappable],
        props: { className: tableColumnClasses[4] },
      },
      {
        title: t('Throughput'),
        transforms: [wrappable],
        props: { className: tableColumnClasses[5] },
      },
      {
        title: t('Latency'),
        props: { className: tableColumnClasses[6] },
      },
      {
        title: '',
        props: { className: tableColumnClasses[7] },
      },
    ];
  };
  Header.displayName = 'SSHeader';

  const [latency] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.LATENCY],
  });
  const [iops] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.IOPS],
  });
  const [throughput] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.THROUGHPUT],
  });
  const [rawCapacity] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.RAW_CAPACITY],
  });
  const [usedCapacity] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.USED_CAPACITY],
  });

  const normalizedMetrics = React.useMemo(
    () => ({
      normalizedMetrics: normalizeMetrics(
        props.data,
        latency,
        throughput,
        rawCapacity,
        usedCapacity,
        iops
      ),
    }),
    [props.data, iops, latency, rawCapacity, throughput, usedCapacity]
  );

  return (
    <Table
      {...props}
      customData={normalizedMetrics}
      aria-label={t('Storage Systems')}
      Header={Header}
      Row={SystemTableRow}
      virtualize
    />
  );
};

const StorageSystemListPage: React.FC<RouteComponentProps> = (props) => {
  const createProps = {
    to: `/k8s/ns/openshift-storage/${referenceForModel(
      ClusterServiceVersionModel
    )}/odf-operator/${referenceForModel(ODFStorageSystem)}/~new`,
  };
  return (
    <ListPage
      {...props}
      showTitle={false}
      ListComponent={StorageSystemList}
      kind={referenceForModel(ODFStorageSystem)}
      namespace={CEPH_STORAGE_NAMESPACE}
      canCreate
      createProps={createProps}
    />
  );
};

type StorageSystemListProps = {
  ListComponent: React.ComponentType;
  kinds: string[];
  filters?: any;
  flatten?: any;
  rowFilters?: any[];
  hideNameLabelFilters?: boolean;
  hideLabelFilter?: boolean;
  columnLayout?: any;
  name?: string;
  resources?: FirehoseResourcesResult;
  reduxIDs?: string[];
  textFilter?: string;
  nameFilterPlaceholder?: string;
  labelFilterPlaceholder?: string;
  label?: string;
  staticFilters?: { key: string; value: string }[];
  data?: StorageSystemKind[];
};

export default StorageSystemListPage;
