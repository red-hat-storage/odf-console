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
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import './TopologySidebar.scss';

const getAppLink = (name: string, namespace: string) => {
  return `/k8s/ns/${namespace}/ramendr.openshift.io~v1alpha1~DRPlacementControl/${name}`;
};

type AppSidebarProps = {
  edgeData: any;
};

const GroupedAppsView: React.FC<{
  apps: any[];
  clusterName: string;
  appCount: number;
}> = ({ apps, clusterName, appCount }) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  // Transform apps to K8s resource format for ListPageFilter
  const appsAsResources = React.useMemo(() => {
    return apps.map((app: any) => ({
      ...app,
      metadata: {
        name: app.name,
        namespace: app.namespace,
      },
    }));
  }, [apps]);

  // Get unique statuses from apps
  const uniqueStatuses = React.useMemo(() => {
    return Array.from(new Set(apps.map((app: any) => app.status))) as string[];
  }, [apps]);

  // Define row filters for the ListPageFilter
  const rowFilters: RowFilter[] = React.useMemo(
    () => [
      {
        filterGroupName: t('Status'),
        type: 'dr-status',
        reducer: (app: any) => app.status,
        filter: (input, app: any) => {
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
    return filteredAppsAsResources.map((appResource: any) => {
      const { metadata, ...appData } = appResource;
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
                  {filteredApps.map((app: any, index: number) => (
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
                          {app.status === 'Critical' && (
                            <>
                              <ExclamationCircleIcon color="var(--pf-v5-global--danger-color--100)" />
                              <span>{t('Critical')}</span>
                            </>
                          )}
                          {app.status === 'Available' && (
                            <>
                              <CheckCircleIcon color="var(--pf-v5-global--success-color--100)" />
                              <span>{t('Available')}</span>
                            </>
                          )}
                          {app.status === 'FailedOver' && (
                            <>
                              <ExclamationCircleIcon color="var(--pf-v5-global--warning-color--100)" />
                              <span>{t('FailedOver')}</span>
                            </>
                          )}
                          {!['Critical', 'Available', 'FailedOver'].includes(
                            app.status
                          ) && <span>{app.status}</span>}
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
  // Handle grouped apps (multiple apps with same status)
  if (edgeData?.isGrouped && edgeData?.apps) {
    return (
      <GroupedAppsView
        apps={edgeData.apps}
        clusterName={edgeData.clusterName}
        appCount={edgeData.apps.length}
      />
    );
  }

  // Handle static app node selection (not in operation) - use table view
  if (edgeData?.isStatic && edgeData?.appInfo) {
    const appInfo = edgeData.appInfo;
    const clusterName = edgeData.clusterName;

    // Wrap single app in array for consistent table view
    return (
      <GroupedAppsView
        apps={[appInfo]}
        clusterName={clusterName}
        appCount={1}
      />
    );
  }

  // Handle app node selection (during operation) - use table view
  const operations =
    edgeData.operations || (edgeData.operation ? [edgeData.operation] : []);
  const clusterName = edgeData.clusterName;

  // Convert operation data to app format for table view
  const appsFromOperations = operations.map((op: any) => ({
    name: op.drpcName,
    namespace: op.applicationNamespace,
    status: op.phase || 'Unknown',
    drPolicy: `${op.action}: ${op.sourceCluster} → ${op.targetCluster}`,
  }));

  return (
    <GroupedAppsView
      apps={appsFromOperations}
      clusterName={clusterName}
      appCount={appsFromOperations.length}
    />
  );
};
