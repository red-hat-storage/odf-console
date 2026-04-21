import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  ListPageBody,
  ListPageFilter,
  useListPageFilter,
  RowFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Title,
  Label,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Button,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import {
  AppSidebarItem,
  StaticAppsSidebarData,
  OperationAppSidebarData,
} from '../types';
import { getAppLink, DRStatusIcon } from '../utils/sidebar-utils';
import './TopologySidebar.scss';

type AppSidebarProps = {
  edgeData: StaticAppsSidebarData | OperationAppSidebarData;
};

type AppResource = AppSidebarItem & {
  metadata: { name: string; namespace: string };
};

const GroupedAppsView: React.FC<{
  apps: AppSidebarItem[];
  clusterName: string;
  appCount: number;
}> = ({ apps, clusterName, appCount }) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  // Transform apps to K8s resource format for ListPageFilter
  const appsAsResources: AppResource[] = React.useMemo(() => {
    return apps.map((app) => ({
      ...app,
      metadata: {
        name: app.name,
        namespace: app.namespace,
      },
    }));
  }, [apps]);

  // Get unique statuses from apps
  const uniqueStatuses = React.useMemo(() => {
    return Array.from(new Set(apps.map((app) => app.status)));
  }, [apps]);

  // Define row filters for the ListPageFilter
  const rowFilters: RowFilter[] = React.useMemo(
    () => [
      {
        filterGroupName: t('Status'),
        type: 'dr-status',
        reducer: (app: AppResource) => app.status,
        filter: (input, app: AppResource) => {
          if (!input || !input.selected?.length) {
            return true;
          }
          return input.selected.includes(app.status);
        },
        items: uniqueStatuses.map((status: string) => ({
          id: status,
          title: status,
        })),
      },
    ],
    [t, uniqueStatuses]
  );

  // Use ListPageFilter hook with transformed data
  const [data, filteredAppsAsResources, onFilterChange] = useListPageFilter(
    appsAsResources,
    rowFilters
  );

  // Transform back to plain app objects
  const filteredApps = React.useMemo(() => {
    return filteredAppsAsResources.map((appResource) => {
      const { metadata, ...appData } = appResource as AppResource;
      return appData;
    });
  }, [filteredAppsAsResources]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Header with app count */}
      <div className="mco-topology-sidebar__header">
        <Title headingLevel="h2" size="xl" style={{ marginBottom: 0 }}>
          {filteredApps.length !== appCount
            ? t('Applications ({{filtered}} of {{total}})', {
                filtered: filteredApps.length,
                total: appCount,
              })
            : t('Applications ({{count}})', { count: appCount })}
        </Title>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ overflowY: 'auto', height: '100%' }}>
          <div className="pf-v6-u-ml-sm pf-v6-u-mt-sm pf-v6-u-mb-sm">
            <DescriptionList isCompact>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Cluster')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {clusterName}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </div>

          <ListPageBody>
            <ListPageFilter
              data={data}
              loaded={true}
              onFilterChange={onFilterChange}
              rowFilters={rowFilters}
              hideColumnManagement={true}
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
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <DRStatusIcon status={app.status} />
                        </div>
                      </Td>
                      <Td dataLabel={t('Policy')}>{app.drPolicy}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </ListPageBody>
        </div>
      </div>
    </div>
  );
};

export const AppSidebar: React.FC<AppSidebarProps> = ({ edgeData }) => {
  if ('isStatic' in edgeData && edgeData.isStatic === true) {
    return (
      <GroupedAppsView
        apps={edgeData.apps}
        clusterName={edgeData.clusterName}
        appCount={edgeData.apps.length}
      />
    );
  }

  const operationData = edgeData as OperationAppSidebarData;
  const operations =
    operationData.operations ||
    (operationData.operation ? [operationData.operation] : []);
  const appsFromOperations = operations.map((op) => ({
    name: op.drpcName,
    namespace: op.applicationNamespace,
    status: op.phase || 'Unknown',
    drPolicy: `${op.action}: ${op.sourceCluster} → ${op.targetCluster}`,
  }));

  return (
    <GroupedAppsView
      apps={appsFromOperations}
      clusterName={operationData.clusterName}
      appCount={appsFromOperations.length}
    />
  );
};
