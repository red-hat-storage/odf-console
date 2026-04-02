import * as React from 'react';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Title,
  Label,
  Button,
  Tab,
  Tabs,
  TabTitleText,
  EmptyState,
  EmptyStateBody,
  EmptyStateActions,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  List,
  ListItem,
  LabelGroup,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  PlusCircleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { DR_BASE_ROUTE } from '../../../constants';
import { TopologyDataContext } from '../context/TopologyContext';
import './TopologySidebar.scss';

type ClusterSidebarProps = {
  resource: K8sResourceCommon;
};

export const ClusterSidebar: React.FC<ClusterSidebarProps> = ({ resource }) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const { clusterAppsMap } = React.useContext(TopologyDataContext);
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(0);

  const resourceName = getName(resource);
  const protectedApps = clusterAppsMap?.[resourceName] || [];
  const hasApps = protectedApps.length > 0;

  // Extract cluster information
  const clusterData = resource as any;
  const conditions = clusterData?.status?.conditions || [];
  const isHealthy = conditions.find(
    (c: any) =>
      c.type === 'ManagedClusterConditionAvailable' && c.status === 'True'
  );
  const version = clusterData?.status?.version?.kubernetes || t('N/A');
  const clusterID =
    clusterData?.spec?.clusterID || clusterData?.status?.clusterID || t('N/A');
  const labels = clusterData?.metadata?.labels || {};

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Header with cluster name */}
      <div className="mco-topology-sidebar__header">
        <Title headingLevel="h2" size="xl" style={{ marginBottom: 0 }}>
          {resourceName}
        </Title>
        {/* Add status badge if cluster is available */}
        {isHealthy ? (
          <Label color="green" icon={<CheckCircleIcon />}>
            {t('Healthy')}
          </Label>
        ) : (
          <Label color="red" icon={<ExclamationCircleIcon />}>
            {t('Unhealthy')}
          </Label>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Tabs
          activeKey={activeTabKey}
          onSelect={(_event, tabKey) => setActiveTabKey(tabKey)}
          role="region"
        >
          <Tab eventKey={0} title={<TabTitleText>{t('Details')}</TabTitleText>}>
            <div className="pf-v6-u-ml-sm pf-v6-u-mt-sm">
              <DescriptionList isCompact>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Name')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {resourceName}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Status')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {isHealthy ? (
                      <Label color="green" icon={<CheckCircleIcon />}>
                        {t('Available')}
                      </Label>
                    ) : (
                      <Label color="red" icon={<ExclamationCircleIcon />}>
                        {t('Unavailable')}
                      </Label>
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>
                    {t('Kubernetes version')}
                  </DescriptionListTerm>
                  <DescriptionListDescription>
                    {version}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Cluster ID')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {clusterID}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {Object.keys(labels).length > 0 && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Labels')}</DescriptionListTerm>
                    <DescriptionListDescription>
                      <LabelGroup>
                        {Object.entries(labels)
                          .slice(0, 5)
                          .map(([key, value]) => (
                            <Label key={key} isCompact>
                              {key}: {value as string}
                            </Label>
                          ))}
                        {Object.keys(labels).length > 5 && (
                          <Label isCompact color="blue">
                            +{Object.keys(labels).length - 5} {t('more')}
                          </Label>
                        )}
                      </LabelGroup>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {conditions.length > 0 && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('Conditions')}</DescriptionListTerm>
                    <DescriptionListDescription>
                      <List isPlain>
                        {conditions
                          .slice(0, 3)
                          .map((condition: any, idx: number) => (
                            <ListItem key={idx}>
                              <Label
                                color={
                                  condition.status === 'True' ? 'green' : 'grey'
                                }
                                isCompact
                              >
                                {condition.type}: {condition.status}
                              </Label>
                            </ListItem>
                          ))}
                        {conditions.length > 3 && (
                          <ListItem>
                            <Label isCompact color="blue">
                              +{conditions.length - 3} {t('more conditions')}
                            </Label>
                          </ListItem>
                        )}
                      </List>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
            </div>
          </Tab>
          <Tab
            eventKey={1}
            title={<TabTitleText>{t('Application Details')}</TabTitleText>}
          >
            <div style={{ overflowY: 'auto', height: '100%' }}>
              {/* Show table when there are apps */}
              {hasApps ? (
                <Table
                  aria-label={t('Protected applications table')}
                  variant="compact"
                >
                  <Thead>
                    <Tr>
                      <Th>{t('Name')}</Th>
                      <Th>{t('DR Status')}</Th>
                      <Th>{t('Policies')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {protectedApps.map((app, index) => (
                      <Tr key={`${app.namespace}-${app.name}-${index}`}>
                        <Td dataLabel={t('Name')}>
                          <div>
                            <Label color="green" isCompact>
                              {t('DRPC')}
                            </Label>{' '}
                            <Button variant="link" isInline>
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
                        <Td dataLabel={t('Policies')}>{app.drPolicy}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              ) : (
                /* Empty State (when no apps) */
                <EmptyState variant="lg">
                  <PlusCircleIcon
                    style={{
                      fontSize: '80px',
                      color: 'var(--pf-v5-global--Color--200)',
                      marginBottom: '16px',
                    }}
                  />
                  <Title headingLevel="h4" size="lg">
                    {t('Enroll applications')}
                  </Title>
                  <EmptyStateBody>
                    {t(
                      'Add disaster recovery protection to your application to boost resilience and minimise downtime.'
                    )}
                    <br />
                    {t('Applications will be listed in a data table.')}
                  </EmptyStateBody>
                  <EmptyStateActions>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(`${DR_BASE_ROUTE}/protected-applications`)
                      }
                    >
                      {t('Enroll applications')}
                    </Button>
                  </EmptyStateActions>
                </EmptyState>
              )}
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
};
