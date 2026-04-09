import * as React from 'react';
import { getName, getNamespace } from '@odf/shared';
import { odfDocBasePath } from '@odf/shared/constants/doc';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { LoadingInline } from '@odf/shared/generic/status-box';
import { DOC_VERSION } from '@odf/shared/hooks';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import {
  NamespaceModel,
  PersistentVolumeClaimModel,
  PersistentVolumeModel,
  PodModel,
} from '@odf/shared/models';
import {
  ComposableTable,
  RowComponentType,
  TableColumnProps,
} from '@odf/shared/table/composable-table';
import { PersistentVolumeKind, PodKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getInstantVectorStats,
  humanizeDecimalBytesPerSec,
  humanizeIOPS,
  humanizeLatency,
  resourcePathFromModel,
  sortNumericRows,
} from '@odf/shared/utils';
import { ExternalLink } from '@odf/shared/utils/link';
import {
  K8sResourceCommon,
  PrometheusEndpoint,
  PrometheusResult,
  useK8sWatchResource,
  k8sList,
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
import { TableVariant, Td, Tr } from '@patternfly/react-table';
import {
  CephFSSubvolumeMetric,
  getCephFSSubvolumeTopKQuery,
} from '../../../queries';

type SubvolumeRow = K8sResourceCommon & {
  pvcName?: string;
  value: number;
  valueText: string;
  metric: PrometheusResult['metric'];
};

const getSubvolumeInfoDocsURL = (docVersion: string): string =>
  `${odfDocBasePath(
    docVersion
  )}/managing_and_allocating_storage_resources/managing-container-storage-interface-component-resources_rhodf#monitoring-cephfs-subvolume-metrics_rhodf`;

type CephFSSubvolumeExtraProps = {
  metricLabel: string;
  fetchPodsForPVC: (namespace: string, pvcName: string) => Promise<PodKind[]>;
};

const getMetricLabel = (
  metricType: CephFSSubvolumeMetric,
  t: ReturnType<typeof useCustomTranslation>['t']
) => {
  switch (metricType) {
    case CephFSSubvolumeMetric.LATENCY:
      return t('Total Latency');
    case CephFSSubvolumeMetric.THROUGHPUT:
      return t('Total Throughput');
    case CephFSSubvolumeMetric.IOPS:
    default:
      return t('Total IOPS');
  }
};

const getMetricHumanize = (metricType: CephFSSubvolumeMetric) => {
  switch (metricType) {
    case CephFSSubvolumeMetric.LATENCY:
      return humanizeLatency;
    case CephFSSubvolumeMetric.THROUGHPUT:
      return humanizeDecimalBytesPerSec;
    case CephFSSubvolumeMetric.IOPS:
    default:
      return humanizeIOPS;
  }
};

// Fetch pods for a specific PVC (called on-demand when user clicks name)
const fetchPodsForPVC = async (
  namespace: string,
  pvcName: string
): Promise<PodKind[]> => {
  try {
    const response = await k8sList({
      model: PodModel,
      queryParams: { ns: namespace },
    });

    const podList = Array.isArray(response) ? response : response?.items || [];

    const relatedPods = (podList as PodKind[]).filter((pod: PodKind) => {
      const volumes = pod?.spec?.volumes ?? [];
      return volumes.some(
        (volume) => volume?.persistentVolumeClaim?.claimName === pvcName
      );
    });

    return relatedPods;
  } catch {
    return [];
  }
};

const CephFSSubvolumeRow: React.FC<RowComponentType<SubvolumeRow>> = ({
  row,
  rowIndex,
  extraProps,
}) => {
  const { t } = useCustomTranslation();
  const { metricLabel, fetchPodsForPVC: fetchPods }: CephFSSubvolumeExtraProps =
    extraProps;
  const [relatedPods, setRelatedPods] = React.useState<PodKind[]>([]);
  const [isLoadingPods, setIsLoadingPods] = React.useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const pvName = getName(row);
  const pvcNamespace = getNamespace(row);
  const pvcName = row.pvcName;
  const pvcLink =
    pvcName && pvcNamespace
      ? resourcePathFromModel(PersistentVolumeClaimModel, pvcName, pvcNamespace)
      : null;
  const namespaceLink = !!pvcNamespace
    ? resourcePathFromModel(NamespaceModel, pvcNamespace)
    : null;
  const podsListHref = pvcNamespace ? `/k8s/ns/${pvcNamespace}/pods` : null;

  // Lazy load pods when name is clicked
  const handleNameClick = React.useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      setIsPopoverOpen(true);
      if (
        pvcName &&
        pvcNamespace &&
        relatedPods.length === 0 &&
        !isLoadingPods
      ) {
        setIsLoadingPods(true);
        try {
          const pods = await fetchPods(pvcNamespace, pvcName);
          setRelatedPods(pods);
        } catch {
          setRelatedPods([]);
        } finally {
          setIsLoadingPods(false);
        }
      }
    },
    [pvcName, pvcNamespace, relatedPods.length, isLoadingPods, fetchPods]
  );

  return (
    <Tr key={rowIndex}>
      <Td dataLabel={t('Name')}>
        {pvcLink ? (
          <Popover
            isVisible={isPopoverOpen}
            shouldClose={() => setIsPopoverOpen(false)}
            headerContent={t('Related pods')}
            bodyContent={
              <>
                {isLoadingPods ? (
                  <LoadingInline />
                ) : relatedPods.length ? (
                  <List>
                    {relatedPods.map((pod) => {
                      const podName = getName(pod);
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
                {relatedPods.length > 0 && podsListHref ? (
                  <div className="pf-v6-u-mt-sm">
                    <Link to={podsListHref}>{t('View all')}</Link>
                  </div>
                ) : null}
              </>
            }
          >
            <Button
              variant="link"
              isInline
              aria-label={t('Show related pods')}
              onClick={handleNameClick}
            >
              {pvName}
            </Button>
          </Popover>
        ) : (
          pvName
        )}
      </Td>
      <Td dataLabel={t('Namespace')}>
        {namespaceLink ? (
          <Link to={namespaceLink}>{pvcNamespace}</Link>
        ) : (
          pvcNamespace
        )}
      </Td>
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
    PersistentVolumeKind[]
  >({
    isList: true,
    kind: PersistentVolumeModel.kind,
  });

  const pvToClaimMap = React.useMemo<
    Record<string, { pvcName: string; namespace: string }>
  >(() => {
    if (!pvsLoaded || pvsLoadError) {
      return {};
    }
    return pvs.reduce<Record<string, { pvcName: string; namespace: string }>>(
      (acc, pv) => {
        const pvName = getName(pv);
        const claimRef = pv?.spec.claimRef;
        if (pvName && claimRef?.name && claimRef?.namespace) {
          acc[pvName] = {
            pvcName: claimRef.name,
            namespace: claimRef.namespace,
          };
        }
        return acc;
      },
      {}
    );
  }, [pvs, pvsLoaded, pvsLoadError]);

  const metricLabel = getMetricLabel(metricType, t);
  const metricValueHumanize = getMetricHumanize(metricType);

  const rows: SubvolumeRow[] = React.useMemo(() => {
    const stats = getInstantVectorStats(data) || [];

    return stats.map(({ metric, y }) => {
      const pvName = metric?.pv_name;
      const pvcNamespace = metric?.pvc_namespace;
      const subvolumeName = metric?.subvolume;

      const mappedClaim = pvName ? pvToClaimMap[pvName] : undefined;
      const pvcName = mappedClaim?.pvcName;

      const namespace = pvcNamespace || mappedClaim?.namespace;
      const humanized = metricValueHumanize(y);
      return {
        pvcName,
        value: y,
        valueText: humanized.string,
        metric,
        metadata: {
          name: subvolumeName || pvName || pvcName,
          namespace,
        },
      };
    });
  }, [data, metricValueHumanize, pvToClaimMap]);

  const selectOptions = [
    { id: CephFSSubvolumeMetric.IOPS, label: t('Total IOPS') },
    { id: CephFSSubvolumeMetric.LATENCY, label: t('Total Latency') },
    { id: CephFSSubvolumeMetric.THROUGHPUT, label: t('Total Throughput') },
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
        sortFunction: (a, b, c) => sortNumericRows(a, b, c, 'value'),
      },
    ],
    [metricLabel, t]
  );

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setOpen((open) => !open)}
      isExpanded={isOpen}
      isFullWidth
    >
      {selectOptions.find((opt) => opt.id === metricType)?.label}
    </MenuToggle>
  );

  return (
    <Card>
      <CardHeader>
        <div className="pf-v6-u-display-flex pf-v6-u-justify-content-space-between pf-v6-u-align-items-center pf-v6-u-gap-md">
          <div className="pf-v6-u-display-flex pf-v6-u-align-items-center pf-v6-u-gap-sm pf-v6-u-flex-grow-1 pf-v6-u-min-width-0">
            <CardTitle className="pf-v6-u-text-truncate">
              {t('Current top 10 subvolumes on all clusters')}
            </CardTitle>
            <FieldLevelHelp>
              <div>
                {t(
                  'Use subvolumes to find pods with poor performing workloads.'
                )}
              </div>
              <div>
                {t(
                  'Since workloads all share the same resource, an application becoming non-responsive or running slow can impact the other applications. Select a subvolume to see the pods using that subvolume or the namespace.'
                )}
              </div>
              <div className="pf-v6-u-mt-sm">
                <ExternalLink href={getSubvolumeInfoDocsURL(DOC_VERSION)}>
                  {t('Learn more')}
                </ExternalLink>
              </div>
            </FieldLevelHelp>
          </div>
          <div className="pf-v6-u-min-width-on-md-200px">
            <Select
              isOpen={isOpen}
              selected={metricType}
              toggle={toggle}
              onSelect={onSelect}
              onOpenChange={(open) => setOpen(open)}
              shouldFocusToggleOnSelect
            >
              <SelectList>
                {selectOptions.map((option) => (
                  <SelectOption key={option.id} value={option.id}>
                    {option.label}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <ComposableTable
          rows={rows}
          columns={columns}
          RowComponent={CephFSSubvolumeRow}
          loaded={!loading}
          loadError={error}
          variant={TableVariant.compact}
          extraProps={{ metricLabel, fetchPodsForPVC }}
        />
      </CardBody>
    </Card>
  );
};

export default CephFSSubvolumeCard;
