import * as React from 'react';
import { getDRStatus } from '@odf/mco/utils/dr-status';
import { DASH } from '@odf/shared/constants';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useNavigate } from 'react-router';
import {
  Title,
  Label,
  List,
  ListItem,
  Button,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { getClustersFromPairKey } from '../../../hooks/useDRPoliciesByClusterPair';
import { getPAVDRPolicyName } from '../../../utils/pav';
import { DROperationInfo, OperationEdgeSidebarData } from '../types';
import { DRStatusIcon, getAppLink } from '../utils/sidebar-utils';
import { DRPCFilterToolbar } from './DRPCFilterToolbar';
import './TopologySidebar.scss';

const getOperationStatus = (op: DROperationInfo) =>
  getDRStatus({
    phase: op.phase,
    progression: op.progression,
    action: op.action,
  });

type OperationSidebarProps = {
  edgeData: OperationEdgeSidebarData;
};

const OperationsTableView: React.FC<{
  operations: DROperationInfo[];
  cluster1: string;
  cluster2: string;
}> = ({ operations, cluster1, cluster2 }) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const [nameFilter, setNameFilter] = React.useState('');
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([]);

  const uniqueStatuses = React.useMemo(
    () => Array.from(new Set(operations.map((op) => getOperationStatus(op)))),
    [operations]
  );

  const filteredOperations = React.useMemo(() => {
    let results = operations;
    if (nameFilter) {
      const lowerFilter = nameFilter.toLowerCase();
      results = results.filter((op) =>
        op.applicationName.toLowerCase().includes(lowerFilter)
      );
    }
    if (selectedStatuses.length > 0) {
      results = results.filter((op) =>
        selectedStatuses.includes(getOperationStatus(op))
      );
    }
    return results;
  }, [operations, nameFilter, selectedStatuses]);

  const operationCount = operations.length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Header with operation count */}
      <div className="mco-topology-sidebar__header">
        <Title headingLevel="h2" size="xl" style={{ marginBottom: 0 }}>
          {filteredOperations.length !== operationCount
            ? t('DR Operations ({{filtered}} of {{total}})', {
                filtered: filteredOperations.length,
                total: operationCount,
              })
            : t('DR Operations ({{count}})', { count: operationCount })}
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
                <DescriptionListTerm>
                  {t('Between clusters')}
                </DescriptionListTerm>
                <DescriptionListDescription>
                  <List isPlain>
                    <ListItem>{cluster1}</ListItem>
                    <ListItem>{cluster2}</ListItem>
                  </List>
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </div>

          <div className="mco-topology-sidebar__drpc-table">
            <DRPCFilterToolbar
              nameFilter={nameFilter}
              onNameFilterChange={setNameFilter}
              statusOptions={uniqueStatuses}
              selectedStatuses={selectedStatuses}
              onSelectedStatusesChange={setSelectedStatuses}
            />

            {filteredOperations.length === 0 ? (
              <EmptyState variant="sm" className="pf-v6-u-mt-lg">
                <Title headingLevel="h4" size="lg">
                  {t('No operations found')}
                </Title>
                <EmptyStateBody>
                  {t('No operations match the current filters.')}
                </EmptyStateBody>
              </EmptyState>
            ) : (
              <Table aria-label={t('DR Operations table')} variant="compact">
                <Thead>
                  <Tr>
                    <Th>{t('Name')}</Th>
                    <Th>{t('DR Status')}</Th>
                    <Th>{t('Policy')}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredOperations.map((operation, index) => (
                    <Tr key={`${operation.drpcName}-${index}`}>
                      <Td dataLabel={t('Name')}>
                        <div>
                          <Label color="green" isCompact>
                            {t('DRPC')}
                          </Label>{' '}
                          <Button
                            variant="link"
                            isInline
                            onClick={() =>
                              navigate(
                                getAppLink(
                                  operation.drpcName,
                                  operation.applicationNamespace
                                )
                              )
                            }
                          >
                            {operation.applicationName}
                          </Button>
                        </div>
                      </Td>
                      <Td dataLabel={t('DR Status')}>
                        <DRStatusIcon status={getOperationStatus(operation)} />
                      </Td>
                      <Td dataLabel={t('Policy')}>
                        {operation.pav
                          ? getPAVDRPolicyName(operation.pav)
                          : DASH}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const OperationSidebar: React.FC<OperationSidebarProps> = ({
  edgeData,
}) => {
  // Handle failover node selection or edge selection - show operations table
  if (edgeData?.operations && edgeData?.pairKey) {
    const operations = edgeData.operations;
    const pairKey = edgeData.pairKey;
    const [cluster1, cluster2] = getClustersFromPairKey(pairKey);

    return (
      <OperationsTableView
        operations={operations}
        cluster1={cluster1}
        cluster2={cluster2}
      />
    );
  }

  // Fallback for old single operation format (if needed)
  const { operation, pairKey } = edgeData || {};
  if (!operation || !pairKey) {
    return null;
  }
  const [cluster1, cluster2] = getClustersFromPairKey(pairKey);

  // Show table view even for single operation for consistency
  return (
    <OperationsTableView
      operations={[operation]}
      cluster1={cluster1}
      cluster2={cluster2}
    />
  );
};
