import * as React from 'react';
import { DASH } from '@odf/shared';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { ProjectModel } from '@odf/shared/models';
import {
  ComposableTable,
  RowComponentType,
  TableColumnProps,
} from '@odf/shared/table/composable-table';
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
  PrometheusResult,
} from '@openshift-console/dynamic-plugin-sdk';
import { Link } from 'react-router-dom-v5-compat';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  MenuToggle,
  MenuToggleElement,
  Popover,
  PopoverPosition,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { CubesIcon, HelpIcon, TimesIcon } from '@patternfly/react-icons';
import { SortByDirection, TableVariant, Td, Tr } from '@patternfly/react-table';
import {
  CephFSSubvolumeMetric,
  getCephFSSubvolumeTopKQuery,
} from '../../../queries';
import './cephfs-subvolume-card.scss';

// Refresh metrics every 30 seconds
const METRICS_POLL_INTERVAL = 30000;

type SubvolumeRow = K8sResourceCommon & {
  name: string;
  namespace: string;
  value: number;
  valueText: string;
  metric: PrometheusResult['metric'];
};

const SUBVOLUME_LABEL = 'subvolume_path';

const sortByMetricValue = (
  a: SubvolumeRow,
  b: SubvolumeRow,
  direction: SortByDirection
) =>
  direction === SortByDirection.asc ? a.value - b.value : b.value - a.value;

type SubvolumeDetailPopoverProps = {
  subvolumePath: string;
  pvcName?: string;
  pvcNamespace?: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const SubvolumeDetailPopover: React.FC<SubvolumeDetailPopoverProps> = ({
  subvolumePath,
  pvcName,
  pvcNamespace,
  isOpen,
  onClose,
  children,
}) => {
  const { t } = useCustomTranslation();

  // TODO (RHSTOR-7679): Query for pods using this PVC when metrics include PVC info
  // For now, show placeholder content
  const relatedPods: string[] = [];

  const popoverContent = (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--pf-v5-global--spacer--md)',
        }}
      >
        <strong style={{ fontSize: 'var(--pf-v5-global--FontSize--sm)' }}>
          {subvolumePath}
        </strong>
        <Button
          variant="plain"
          aria-label={t('Close')}
          onClick={onClose}
          style={{ padding: 0 }}
        >
          <TimesIcon />
        </Button>
      </div>
      <div>
        <div
          style={{
            fontWeight: 600,
            marginBottom: 'var(--pf-v5-global--spacer--sm)',
          }}
        >
          {t('Related pods')}
        </div>
        {relatedPods.length > 0 ? (
          <>
            <ul style={{ paddingLeft: 'var(--pf-v5-global--spacer--md)' }}>
              {relatedPods.slice(0, 5).map((pod) => (
                <li key={pod}>
                  <Link to={`/k8s/ns/${pvcNamespace}/pods/${pod}`}>{pod}</Link>
                </li>
              ))}
            </ul>
            {pvcNamespace && (
              <Link to={`/k8s/ns/${pvcNamespace}/pods`}>
                {relatedPods.length > 5 ? t('View all') : t('View all pods')}
              </Link>
            )}
          </>
        ) : (
          <>
            <div
              style={{
                fontStyle: 'italic',
                color: 'var(--pf-v5-global--Color--200)',
                marginBottom: 'var(--pf-v5-global--spacer--sm)',
              }}
            >
              {pvcName
                ? t('No pods currently using this volume')
                : t(
                    'Pod information will be available when PVC metrics are provided'
                  )}
            </div>
            {pvcNamespace && (
              <Link to={`/k8s/ns/${pvcNamespace}/pods`}>
                {t('View all pods')}
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      aria-label={t('Subvolume details')}
      position={PopoverPosition.right}
      bodyContent={popoverContent}
      isVisible={isOpen}
      shouldClose={() => onClose()}
      minWidth="300px"
    >
      <div>{children}</div>
    </Popover>
  );
};

const CephFSSubvolumeRow: React.FC<RowComponentType<SubvolumeRow>> = ({
  row,
  rowIndex,
  extraProps,
}) => {
  const { t } = useCustomTranslation();
  const metricLabel = extraProps?.metricLabel ?? t('Total IOPS');
  const [isPopoverOpen, setPopoverOpen] = React.useState(false);

  // NOTE (RHSTOR-7679): pvc and namespace labels will be available once
  // Ceph provides joined PVC mapping metrics. Currently these will be undefined.
  const pvcName = row.metric?.pvc;
  const pvcNamespace = row.metric?.namespace;
  const subvolumePath = row.metric?.subvolume_path || row.name;

  return (
    <Tr key={rowIndex}>
      <Td dataLabel={t('Name')}>
        <SubvolumeDetailPopover
          subvolumePath={subvolumePath}
          pvcName={pvcName}
          pvcNamespace={pvcNamespace}
          isOpen={isPopoverOpen}
          onClose={() => setPopoverOpen(false)}
        >
          <Button
            variant="link"
            isInline
            onClick={() => setPopoverOpen(!isPopoverOpen)}
            className="odf-cephfs-subvolume-card__subvolume-link"
          >
            {row.name}
          </Button>
        </SubvolumeDetailPopover>
      </Td>
      <Td dataLabel={t('Namespace')}>
        {pvcNamespace && pvcNamespace !== DASH ? (
          <Link to={resourcePathFromModel(ProjectModel, pvcNamespace)}>
            {row.namespace}
          </Link>
        ) : (
          row.namespace
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
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
    delay: METRICS_POLL_INTERVAL,
  });

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
    const stats = getInstantVectorStats(data, SUBVOLUME_LABEL);
    return stats.map(({ metric, y }) => {
      const pvcName = metric?.pvc;
      // NOTE (RHSTOR-7679): namespace will be populated once joined PVC metrics are available.
      // Currently this will always be DASH because metrics don't include namespace label.
      const namespace = metric?.namespace || DASH;
      const subvolumeName = metric?.subvolume || metric?.subvolume_path || DASH;
      // Prefer PVC name when available, otherwise show subvolume path
      const name = pvcName || subvolumeName;
      const humanized = metricValueHumanize(y);
      return {
        name,
        namespace,
        value: y,
        valueText: humanized.string,
        metric,
        metadata: {
          name,
          namespace: namespace === DASH ? undefined : namespace,
        },
      };
    });
  }, [data, metricValueHumanize]);

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
        <CardTitle>
          {t('Current top 10 subvolumes on all clusters')}
          <Popover
            aria-label={t('Subvolume metrics help')}
            bodyContent={t(
              'Shows the top 10 CephFS subvolumes ranked by the selected metric. Click on a subvolume to view related pods.'
            )}
          >
            <button
              type="button"
              aria-label={t('More info')}
              onClick={(e) => e.preventDefault()}
              className="pf-v5-c-button pf-m-plain pf-m-small odf-cephfs-subvolume-card__help-icon"
            >
              <HelpIcon />
            </button>
          </Popover>
        </CardTitle>
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
        {rows.length === 0 && !loading && !error ? (
          <EmptyState variant="sm">
            <EmptyStateHeader
              titleText={t('No CephFS subvolumes found')}
              icon={<EmptyStateIcon icon={CubesIcon} />}
              headingLevel="h4"
            />
            <EmptyStateBody>
              {t(
                'CephFS subvolume metrics will appear here when subvolumes are created and have active I/O workload.'
              )}
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <ComposableTable
            rows={rows}
            columns={columns}
            RowComponent={CephFSSubvolumeRow}
            loaded={!loading}
            loadError={error}
            unfilteredData={rows as []}
            variant={TableVariant.compact}
            extraProps={{ metricLabel }}
          />
        )}
      </CardBody>
    </Card>
  );
};

export default CephFSSubvolumeCard;
