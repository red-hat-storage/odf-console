import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { global_danger_color_100 as dangerColor } from '@patternfly/react-tokens/dist/js/global_danger_color_100';
import { global_warning_color_100 as warningColor } from '@patternfly/react-tokens/dist/js/global_warning_color_100';
import { useParams } from 'react-router-dom-v5-compat';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import { getPoolQuery, StorageDashboardQuery } from '../../../queries';
import { ODFSystemParams } from '../../../types';
import { getPerPoolMetrics } from '../../../utils';
import {
  POOL_NEAR_FULL_THRESHOLD,
  POOL_FULL_THRESHOLD,
  getPoolUtilizationPercentage,
} from '../../../utils/pool-utilization';

export const PoolUtilizationCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { namespace: clusterNs } = useParams<ODFSystemParams>();
  const { systemFlags } = useODFSystemFlagsSelector();
  const managedByOCS = systemFlags[clusterNs]?.ocsClusterName;

  const [poolNames, setPoolNames] = React.useState<string[]>([]);

  const [utilizationData, utilizationLoading, utilizationLoadError] =
    useCustomPrometheusPoll({
      query: poolNames?.length
        ? getPoolQuery(
            poolNames,
            StorageDashboardQuery.POOL_UTILIZATION_PERCENTAGE,
            managedByOCS
          )
        : '',
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const poolUtilization = getPerPoolMetrics(
    utilizationData,
    utilizationLoadError,
    utilizationLoading
  );

  const poolsNeedingAttention = React.useMemo(() => {
    if (!poolNames?.length || !poolUtilization) return [];
    return poolNames
      .map((poolName) => {
        const utilization = getPoolUtilizationPercentage(
          poolUtilization,
          poolName
        );
        return {
          name: poolName,
          utilization,
          needsAttention: utilization >= POOL_NEAR_FULL_THRESHOLD,
          critical: utilization >= POOL_FULL_THRESHOLD,
        };
      })
      .filter((pool) => pool.needsAttention)
      .sort((a, b) => b.utilization - a.utilization);
  }, [poolNames, poolUtilization]);

  const criticalCount = poolsNeedingAttention.filter((p) => p.critical).length;
  const warningCount = poolsNeedingAttention.filter((p) => !p.critical).length;

  React.useEffect(() => {
    setPoolNames(['pool-1', 'pool-2', 'pool-3']); // Placeholder
  }, [managedByOCS]);

  const renderUtilizationSummary = () => {
    if (poolsNeedingAttention.length === 0) {
      return (
        <div>
          <p>{t('All storage pools have healthy utilization levels')}</p>
        </div>
      );
    }

    return (
      <div>
        {criticalCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <ExclamationCircleIcon
              style={{ color: dangerColor.value, marginRight: '8px' }}
            />
            <span>
              {t('{{count}} pool(s) nearly full (>{{threshold}}%)', {
                count: criticalCount,
                threshold: POOL_FULL_THRESHOLD,
              })}
            </span>
          </div>
        )}
        {warningCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <ExclamationTriangleIcon
              style={{ color: warningColor.value, marginRight: '8px' }}
            />
            <span>
              {t('{{count}} pool(s) need attention (>{{threshold}}%)', {
                count: warningCount,
                threshold: POOL_NEAR_FULL_THRESHOLD,
              })}
            </span>
          </div>
        )}
        <div>
          {poolsNeedingAttention.slice(0, 3).map((pool) => (
            <div
              key={pool.name}
              style={{ marginLeft: '16px', marginBottom: '4px' }}
            >
              {pool.name}: {pool.utilization.toFixed(1)}%
            </div>
          ))}
          {poolsNeedingAttention.length > 3 && (
            <div style={{ marginLeft: '16px', fontStyle: 'italic' }}>
              {t('and {{count}} more...', {
                count: poolsNeedingAttention.length - 3,
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Storage pool utilization')}</CardTitle>
      </CardHeader>
      <CardBody>
        {!utilizationLoading &&
          !utilizationLoadError &&
          renderUtilizationSummary()}
        {utilizationLoading && <div>{t('Loading pool utilization...')}</div>}
        {utilizationLoadError && (
          <div>{t('Error loading pool utilization data')}</div>
        )}
      </CardBody>
    </Card>
  );
};

export default PoolUtilizationCard;
