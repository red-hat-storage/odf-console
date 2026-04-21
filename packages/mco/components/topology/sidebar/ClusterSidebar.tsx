import * as React from 'react';
import { getLabels, getName } from '@odf/shared/selectors';
import { K8sResourceCondition } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
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
import {
  DR_BASE_ROUTE,
  MANAGED_CLUSTER_CONDITION_AVAILABLE,
} from '../../../constants';
import { ACMManagedClusterKind } from '../../../types';
import { TopologyDataContext } from '../context/TopologyContext';
import { DRStatusIcon } from '../utils/sidebar-utils';
import './TopologySidebar.scss';

type ClusterSidebarProps = {
  resource: ACMManagedClusterKind;
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
  const conditions: K8sResourceCondition[] = resource.status?.conditions || [];
  const isHealthy = conditions.find(
    (c) => c.type === MANAGED_CLUSTER_CONDITION_AVAILABLE && c.status === 'True'
  );
  const version = resource.status?.version?.kubernetes || t('N/A');
  const clusterID =
    resource.spec?.clusterID || resource.status?.clusterID || t('N/A');
  const labels = getLabels(resource) || {};

  return (
    <div className="mco-topology-sidebar__container">
      {/* Header with cluster name */}
      <div className="mco-topology-sidebar__header">
        <Title
          headingLevel="h2"
          size="xl"
          className="mco-topology-sidebar__header-title"
        >
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

      <div className="mco-topology-sidebar__content">
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
                        {conditions.slice(0, 3).map((condition, idx) => (
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
            <div className="mco-topology-sidebar__tab-content">
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
                          <div className="mco-topology-sidebar__app-status">
                            <DRStatusIcon status={app.status} />
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
                  <PlusCircleIcon className="mco-topology-sidebar__empty-state-icon" />
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
