// TODO (@rexagod): https://github.com/openshift/console/pull/10470#discussion_r766453369
import * as React from 'react';
import ConsumerPopover from '@odf/shared/dashboards/utilization-card/ConsumerPopover';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import {
  humanizeBinaryBytes,
  humanizeDecimalBytesPerSec,
} from '@odf/shared/utils';
import { UtilizationDurationDropdown } from '@openshift-console/dynamic-plugin-sdk-internal';
import { ByteDataTypes } from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-types';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardActions,
  CardHeader,
  CardTitle,
  Grid,
} from '@patternfly/react-core';
import {
  StorageDashboardQuery,
  utilizationPopoverQueryMap,
  UTILIZATION_QUERY,
} from '../../../queries';
import './utilization-card.scss';
import { PrometheusMultilineUtilizationItem } from './prometheus-multi-utilization-item';
import { PrometheusUtilizationItem } from './prometheus-utilization-item';
import { humanizeIOPS, humanizeLatency } from './utils';

const UtilizationCard: React.FC = () => {
  const { t } = useTranslation();
  const storagePopover = React.useCallback(
    ({ current }) => (
      <ConsumerPopover
        title={t('ceph-storage-plugin~Used Capacity')}
        current={current}
        consumers={utilizationPopoverQueryMap}
        humanize={humanizeBinaryBytes}
        namespace="openshift-storage"
        description={undefined}
      />
    ),
    [t]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="co-utilization-card__title">
          {t('ceph-storage-plugin~Utilization')}
          <FieldLevelHelp>
            {t(
              'ceph-storage-plugin~Performance metrics over time showing IOPS, Latency and more. Each metric is a link to a detailed view of this metric.'
            )}
          </FieldLevelHelp>
        </CardTitle>
        <CardActions>
          <UtilizationDurationDropdown />
        </CardActions>
      </CardHeader>
      <Grid className="co-utilization-card__body">
        <PrometheusUtilizationItem
          title={t('ceph-storage-plugin~Used Capacity')}
          utilizationQuery={
            UTILIZATION_QUERY[StorageDashboardQuery.CEPH_CAPACITY_USED]
          }
          humanizeValue={humanizeBinaryBytes}
          byteDataType={ByteDataTypes.BinaryBytes}
          TopConsumerPopover={storagePopover}
        />
        <PrometheusMultilineUtilizationItem
          title={t('ceph-storage-plugin~IOPS')}
          queries={[
            UTILIZATION_QUERY[
              StorageDashboardQuery.UTILIZATION_IOPS_READ_QUERY
            ],
            UTILIZATION_QUERY[
              StorageDashboardQuery.UTILIZATION_IOPS_WRITE_QUERY
            ],
          ]}
          humanizeValue={humanizeIOPS}
          chartType="stacked-area"
        />
        <PrometheusMultilineUtilizationItem
          title={t('ceph-storage-plugin~Throughput')}
          queries={[
            UTILIZATION_QUERY[
              StorageDashboardQuery.UTILIZATION_THROUGHPUT_READ_QUERY
            ],
            UTILIZATION_QUERY[
              StorageDashboardQuery.UTILIZATION_THROUGHPUT_WRITE_QUERY
            ],
          ]}
          humanizeValue={humanizeDecimalBytesPerSec}
          chartType="stacked-area"
        />
        <PrometheusMultilineUtilizationItem
          title={t('ceph-storage-plugin~Latency')}
          queries={[
            UTILIZATION_QUERY[
              StorageDashboardQuery.UTILIZATION_LATENCY_READ_QUERY
            ],
            UTILIZATION_QUERY[
              StorageDashboardQuery.UTILIZATION_LATENCY_WRITE_QUERY
            ],
          ]}
          humanizeValue={humanizeLatency}
          chartType="grouped-line"
        />
        <PrometheusUtilizationItem
          title={t('ceph-storage-plugin~Recovery')}
          utilizationQuery={
            UTILIZATION_QUERY[
              StorageDashboardQuery.UTILIZATION_RECOVERY_RATE_QUERY
            ]
          }
          humanizeValue={humanizeDecimalBytesPerSec}
        />
      </Grid>
    </Card>
  );
};

export default UtilizationCard;
