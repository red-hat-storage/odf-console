import * as React from 'react';
import { DASH, getName } from '@odf/shared';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import {
  PersistentVolumeClaimModel,
  PersistentVolumeModel,
  PodModel,
} from '@odf/shared/models';
import {
  ComposableTable,
  RowComponentType,
  TableColumnProps,
} from '@odf/shared/table/composable-table';
import { PodKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getInstantVectorStats,
  humanizeDecimalBytesPerSec,
  humanizeNumber,
  humanizeSeconds,
  resourcePathFromModel,
} from '@odf/shared/utils';
import {
  K8sResourceCommon,
  PrometheusEndpoint,
  PrometheusResult,
  useK8sWatchResource,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import { Link } from 'react-router-dom-v5-compat';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  List,
  ListItem,
  MenuToggle,
  MenuToggleElement,
  Popover,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { SortByDirection, TableVariant, Td, Tr } from '@patternfly/react-table';
import {
  CephFSSubvolumeMetric,
  getCephFSSubvolumeTopKQuery,
} from '../../../queries';
import './cephfs-subvolume-card.scss';

type SubvolumeRow = K8sResourceCommon & {
  name: string;
  namespace: string;
  pvName?: string;
  pvcName?: string;
  value: number;
  valueText: string;
  metric: PrometheusResult['metric'];
};

const SUBVOLUME_LABEL = 'subvolume';
const SUBVOLUME_LABEL_KEYS = [
  SUBVOLUME_LABEL,
  'subvolume_path',
  'pv_name',
  'name',
];

type PersistentVolumeWithClaimRef = K8sResourceCommon & {
  spec?: {
    claimRef?: {
      name?: string;
      namespace?: string;
    };
  };
};

type CephFSSubvolumeExtraProps = {
  metricLabel: string;
  relatedPodsMap: Map<string, PodKind[]>;
};

const sortByMetricValue = (
  a: SubvolumeRow,
  b: SubvolumeRow,
  direction: SortByDirection
) =>
  direction === SortByDirection.asc ? a.value - b.value : b.value - a.value;

const CephFSSubvolumeRow: React.FC<RowComponentType<SubvolumeRow>> = ({
  row,
  rowIndex,
  extraProps,
}) => {
  const { t } = useCustomTranslation();
  const metricLabel =
    (extraProps as CephFSSubvolumeExtraProps | undefined)?.metricLabel ??
    t('Total IOPS');
  const relatedPodsMap = (extraProps as CephFSSubvolumeExtraProps | undefined)
    ?.relatedPodsMap;
  const pvcName = row.pvcName;
  const pvcNamespace = row.namespace !== DASH ? row.namespace : undefined;
  const pvcLink =
    pvcName && pvcNamespace
      ? resourcePathFromModel(PersistentVolumeClaimModel, pvcName, pvcNamespace)
      : null;
  const relatedPodsKey =
    pvcName && pvcNamespace ? `${pvcNamespace}/${pvcName}` : undefined;
  const relatedPods = relatedPodsKey
    ? (relatedPodsMap?.get(relatedPodsKey) ?? [])
    : [];
  const podsListHref = pvcNamespace
    ? `/k8s/ns/${pvcNamespace}/pods`
    : undefined;

  return (
    <Tr key={rowIndex}>
      <Td dataLabel={t('Name')}>
        {pvcLink ? <Link to={pvcLink}>{row.name}</Link> : row.name}
        {pvcNamespace && pvcName ? (
          <Popover
            headerContent={t('Related pods')}
            bodyContent={
              <>
                {relatedPods.length ? (
                  <List>
                    {relatedPods.map((pod) => {
                      const podName = pod?.metadata?.name;
                      if (!podName) {
                        return null;
                      }
                      const podLink = resourcePathFromModel(
                        PodModel,
                        podName,
                        pvcNamespace
                      );
                      return (
                        <ListItem key={podName}>
                          <Link to={podLink}>{podName}</Link>
                        </ListItem>
                      );
                    })}
                  </List>
                ) : (
                  <div>{t('No related pods found')}</div>
                )}
                {podsListHref ? (
                  <div className="odf-cephfs-subvolume-card__popover-view-all">
                    <Link to={podsListHref}>{t('View all')}</Link>
                  </div>
                ) : null}
              </>
            }
          >
            <Button
              variant="link"
              isInline
              className="odf-cephfs-subvolume-card__popover-trigger"
              aria-label={t('Show related pods')}
            >
              <InfoCircleIcon />
            </Button>
          </Popover>
        ) : null}
      </Td>
      <Td dataLabel={t('Namespace')}>{row.namespace}</Td>
      <Td dataLabel={metricLabel}>{row.valueText}</Td>
    </Tr>
  );
};

export const CephFSSubvolumeCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [metricType, setMetricType] = React.useState<CephFSSubvolumeMetric>(
    CephFSSubvolumeMetric.IOPS
  );
  const [isOpen, setOpen] = React.useState(false);

  const [data, error, loading] = useCustomPrometheusPoll({
    query: getCephFSSubvolumeTopKQuery(metricType),
    endpoint: PrometheusEndpoint.QUERY,
    basePath: usePrometheusBasePath(),
  });

  const [pvs, pvsLoaded, pvsLoadError] = useK8sWatchResource<
    PersistentVolumeWithClaimRef[]
  >({
    isList: true,
    kind: PersistentVolumeModel.kind,
  });

  const pvToClaimMap = React.useMemo(() => {
    if (!pvsLoaded || pvsLoadError) {
      return new Map<string, { pvcName: string; namespace: string }>();
    }
    const map = new Map<string, { pvcName: string; namespace: string }>();
    pvs.forEach((pv) => {
      const pvName = getName(pv);
      const claimRef = pv?.spec?.claimRef;
      if (claimRef?.name && claimRef?.namespace) {
        map.set(pvName, {
          pvcName: claimRef.name,
          namespace: claimRef.namespace,
        });
      }
    });
    return map;
  }, [pvs, pvsLoaded, pvsLoadError]);

  const metricLabel = React.useMemo(() => {
    switch (metricType) {
      case CephFSSubvolumeMetric.LATENCY:
        return t('Total latency');
      case CephFSSubvolumeMetric.THROUGHPUT:
        return t('Total throughput');
      case CephFSSubvolumeMetric.IOPS:
      default:
        return t('Total IOPS');
    }
  }, [metricType, t]);

  const metricValueHumanize = React.useMemo(() => {
    switch (metricType) {
      case CephFSSubvolumeMetric.LATENCY:
        return (value: number) => humanizeSeconds(value, 'ms');
      case CephFSSubvolumeMetric.THROUGHPUT:
        return humanizeDecimalBytesPerSec;
      case CephFSSubvolumeMetric.IOPS:
      default:
        return humanizeNumber;
    }
  }, [metricType]);

  const rows: SubvolumeRow[] = React.useMemo(() => {
    const fallbackStats =
      SUBVOLUME_LABEL_KEYS.reduce<ReturnType<typeof getInstantVectorStats>>(
        (acc, key) => {
          if (acc.length) {
            return acc;
          }
          return getInstantVectorStats(data, key);
        },
        []
      ) || [];
    return fallbackStats.map(({ metric, y }) => {
      const pvName = metric?.pv_name || metric?.name;
      const mappedClaim = pvName ? pvToClaimMap.get(pvName) : undefined;
      const namespace =
        mappedClaim?.namespace ||
        metric?.pv_namespace ||
        metric?.namespace ||
        DASH;
      const subvolumeName = metric?.subvolume || metric?.subvolume_path || DASH;
      const pvcName = mappedClaim?.pvcName || metric?.pvc;
      const name = pvcName || pvName || subvolumeName;
      const humanized = metricValueHumanize(y);
      return {
        name,
        namespace,
        pvName,
        pvcName,
        value: y,
        valueText: humanized.string,
        metric,
        metadata: {
          name,
          namespace: namespace === DASH ? undefined : namespace,
        },
      };
    });
  }, [data, metricValueHumanize, pvToClaimMap]);

  const podWatchResources = React.useMemo(() => {
    const namespaces = Array.from(
      new Set(
        rows.map((row) => row.namespace).filter((ns) => ns && ns !== DASH)
      )
    );
    return namespaces.reduce<Record<string, any>>((acc, ns) => {
      acc[`pods-${ns}`] = {
        isList: true,
        kind: PodModel.kind,
        namespace: ns,
      };
      return acc;
    }, {});
  }, [rows]);

  const podResources = useK8sWatchResources(podWatchResources) as Record<
    string,
    { data?: PodKind[] }
  >;

  const relatedPodsMap = React.useMemo(() => {
    const map = new Map<string, PodKind[]>();
    Object.values(podResources || {}).forEach((resource) => {
      const pods = Array.isArray(resource?.data) ? resource.data : undefined;
      if (!pods?.length) {
        return;
      }
      pods.forEach((pod) => {
        const podNamespace = pod?.metadata?.namespace;
        const volumes = pod?.spec?.volumes ?? [];
        volumes.forEach((volume) => {
          const pvc = volume?.persistentVolumeClaim?.claimName;
          if (!pvc || !podNamespace) {
            return;
          }
          const key = `${podNamespace}/${pvc}`;
          const list = map.get(key) ?? [];
          list.push(pod);
          map.set(key, list);
        });
      });
    });
    return map;
  }, [podResources]);

  const selectOptions = [
    { id: CephFSSubvolumeMetric.IOPS, label: t('Total IOPS') },
    { id: CephFSSubvolumeMetric.LATENCY, label: t('Total latency') },
    { id: CephFSSubvolumeMetric.THROUGHPUT, label: t('Total throughput') },
  ];

  const onSelect = (_e: React.MouseEvent, selection: CephFSSubvolumeMetric) => {
    setMetricType(selection);
    setOpen(false);
  };

  const columns: TableColumnProps[] = React.useMemo(
    () => [
      {
        columnName: t('Name'),
      },
      {
        columnName: t('Namespace'),
      },
      {
        columnName: metricLabel,
        sortFunction: sortByMetricValue as TableColumnProps['sortFunction'],
      },
    ],
    [metricLabel, t]
  );

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setOpen((open) => !open)}
      isExpanded={isOpen}
      className="odf-cephfs-subvolume-card__dropdown"
    >
      {selectOptions.find((opt) => opt.id === metricType)?.label}
    </MenuToggle>
  );

  return (
    <Card>
      <CardHeader className="odf-cephfs-subvolume-card__header">
        <CardTitle>{t('Current top 10 subvolumes')}</CardTitle>
        <Select
          isOpen={isOpen}
          selected={metricType}
          toggle={toggle}
          onSelect={onSelect}
          onOpenChange={(open) => setOpen(open)}
        >
          <SelectList>
            {selectOptions.map((option) => (
              <SelectOption key={option.id} value={option.id}>
                {option.label}
              </SelectOption>
            ))}
          </SelectList>
        </Select>
      </CardHeader>
      <CardBody>
        <ComposableTable
          rows={rows}
          columns={columns}
          RowComponent={CephFSSubvolumeRow}
          loaded={!loading}
          loadError={error}
          unfilteredData={rows as []}
          variant={TableVariant.compact}
          extraProps={{ metricLabel, relatedPodsMap }}
        />
      </CardBody>
    </Card>
  );
};

export default CephFSSubvolumeCard;
