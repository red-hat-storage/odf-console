import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Title,
  Label,
  Button,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { DRPlacementControlConditionType } from '../../../types';
import { getEffectiveDRStatus } from '../../../utils/dr-status';
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
  if ('isStatic' in edgeData && edgeData.isStatic === true) {
    return (
      <div className="mco-topology-sidebar__container">
        <div className="mco-topology-sidebar__header">
          <Title headingLevel="h2" size="xl" style={{ marginBottom: 0 }}>
            {t('Applications')}
          </Title>
        </div>
        <div className="mco-topology-sidebar__content">
          <DRPCTable apps={edgeData.apps} />
        </div>
      </div>
    );
  }

  const operationData = edgeData as OperationAppSidebarData;
  const operations =
    operationData.operations ||
    (operationData.operation ? [operationData.operation] : []);
  const appsFromOperations = operations.map((op) => {
    const protectedCondition = op.drpc?.status?.conditions?.find(
      (c) => c.type === DRPlacementControlConditionType.Protected
    );
    const volumeLastGroupSyncTime = op.drpc?.status?.lastGroupSyncTime;
    return {
      name: op.drpcName,
      namespace: op.applicationNamespace,
      status: getEffectiveDRStatus(
        op.phase,
        op.progression,
        op.hasProtectionError,
        protectedCondition,
        volumeLastGroupSyncTime
      ),
      drPolicy: `${op.action}: ${op.sourceCluster} → ${op.targetCluster}`,
    };
  });

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
