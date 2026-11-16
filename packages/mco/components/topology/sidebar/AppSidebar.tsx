import * as React from 'react';
import { useScheduler } from '@odf/shared/hooks';
import { getAnnotations } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useNavigate } from 'react-router';
import {
  Title,
  Label,
  Button,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { TEST_FAILOVER_DRYRUN_ANNOTATION } from '../../../constants';
import { Progression } from '../../../types';
import { drpcHasVolumes, getProtectedCondition } from '../../../utils';
import { getDRStatus } from '../../../utils/dr-status';
import { getPAVDRPolicyName } from '../../../utils/pav';
import { isRevertingTestFailover } from '../../../utils/test-failover';
import {
  AppSidebarItem,
  StaticAppsSidebarData,
  OperationAppSidebarData,
} from '../types';
import { getAppLink, DRStatusIcon } from '../utils/sidebar-utils';
import { DRPCFilterToolbar } from './DRPCFilterToolbar';
import './TopologySidebar.scss';

type AppSidebarProps = {
  edgeData: StaticAppsSidebarData | OperationAppSidebarData;
};

export type DRPCTableProps = {
  apps: AppSidebarItem[];
};

export const DRPCTable: React.FC<DRPCTableProps> = ({ apps }) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const [nameFilter, setNameFilter] = React.useState('');
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([]);

  const uniqueStatuses = React.useMemo(
    () => Array.from(new Set(apps.map((app) => app.status))),
    [apps]
  );

  const filteredApps = React.useMemo(() => {
    let results = apps;
    if (nameFilter) {
      const lowerFilter = nameFilter.toLowerCase();
      results = results.filter((app) =>
        app.name.toLowerCase().includes(lowerFilter)
      );
    }
    if (selectedStatuses.length > 0) {
      results = results.filter((app) => selectedStatuses.includes(app.status));
    }
    return results;
  }, [apps, nameFilter, selectedStatuses]);

  return (
    <div className="mco-topology-sidebar__drpc-table">
      <DRPCFilterToolbar
        nameFilter={nameFilter}
        onNameFilterChange={setNameFilter}
        statusOptions={uniqueStatuses}
        selectedStatuses={selectedStatuses}
        onSelectedStatusesChange={setSelectedStatuses}
      />

      {filteredApps.length === 0 ? (
        <EmptyState variant="sm" className="pf-v6-u-mt-lg">
          <Title headingLevel="h4" size="lg">
            {t('No applications found')}
          </Title>
          <EmptyStateBody>
            {t('No applications match the current filters.')}
          </EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label={t('Applications table')} variant="compact">
          <Thead>
            <Tr>
              <Th>{t('Name')}</Th>
              <Th>{t('DR Status')}</Th>
              <Th>{t('Policy')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredApps.map((app, index) => (
              <Tr key={`${app.namespace}-${app.name}-${index}`}>
                <Td dataLabel={t('Name')}>
                  <div>
                    <Label color="green" isCompact>
                      {t('DRPC')}
                    </Label>{' '}
                    <Button
                      variant="link"
                      isInline
                      onClick={() =>
                        navigate(getAppLink(app.name, app.namespace))
                      }
                    >
                      {app.name}
                    </Button>
                  </div>
                </Td>
                <Td dataLabel={t('DR Status')}>
                  <div className="mco-topology-sidebar__app-status">
                    <DRStatusIcon status={app.status} />
                  </div>
                </Td>
                <Td dataLabel={t('Policy')}>{app.drPolicy}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
};

export const AppSidebar: React.FC<AppSidebarProps> = ({ edgeData }) => {
  const { t } = useCustomTranslation();
  const isStatic = 'isStatic' in edgeData && edgeData.isStatic === true;
  const operationData = !isStatic
    ? (edgeData as OperationAppSidebarData)
    : undefined;
  const operations =
    operationData?.operations ||
    (operationData?.operation ? [operationData.operation] : []);

  // Preparing → Awaiting resync without waiting for a DRPC watch.
  const needsLagTick = operations.some(
    (op) =>
      !!op.drpc?.spec?.dryRun && op.progression !== Progression.TestingFailover
  );
  const [lagTick, setLagTick] = React.useState(0);
  const bumpLagTick = React.useCallback(() => {
    if (!needsLagTick) return;
    setLagTick((tick) => tick + 1);
  }, [needsLagTick]);
  useScheduler(bumpLagTick, needsLagTick ? undefined : null);

  // lagTick forces getDRStatus to re-run when sync age crosses the threshold.
  const appsFromOperations = React.useMemo(
    () =>
      operations.map((op) => {
        const protectedCondition = getProtectedCondition(op.drpc);
        return {
          name: op.applicationName,
          namespace: op.applicationNamespace,
          status: getDRStatus({
            phase: op.phase,
            progression: op.progression,
            protectedCondition,
            volumeLastGroupSyncTime: op.drpc?.status?.lastGroupSyncTime,
            schedulingInterval: op.schedulingInterval,
            action: op.action,
            dryRun: op.drpc?.spec?.dryRun,
            hasTestFailoverAnnotation:
              getAnnotations(op.drpc)?.[TEST_FAILOVER_DRYRUN_ANNOTATION] ===
              'true',
            hasVolumes: drpcHasVolumes(op.drpc),
            isRevertingTestFailover: isRevertingTestFailover(op.drpc),
          }),
          drPolicy: op.pav ? getPAVDRPolicyName(op.pav) : '',
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lagTick forces lag re-eval
    [operations, lagTick]
  );

  if (isStatic) {
    return (
      <div className="mco-topology-sidebar__container">
        <div className="mco-topology-sidebar__header">
          <Title headingLevel="h2" size="xl" style={{ marginBottom: 0 }}>
            {t('Applications')}
          </Title>
        </div>
        <div className="mco-topology-sidebar__content">
          <DRPCTable apps={(edgeData as StaticAppsSidebarData).apps} />
        </div>
      </div>
    );
  }

  return (
    <div className="mco-topology-sidebar__container">
      <div className="mco-topology-sidebar__header">
        <Title headingLevel="h2" size="xl" style={{ marginBottom: 0 }}>
          {t('Applications')}
        </Title>
      </div>
      <div className="mco-topology-sidebar__content">
        <DRPCTable apps={appsFromOperations} />
      </div>
    </div>
  );
};
