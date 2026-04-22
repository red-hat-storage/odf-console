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
import {
  DR_BASE_ROUTE,
  MANAGED_CLUSTER_CONDITION_AVAILABLE,
} from '../../../constants';
import { ACMManagedClusterKind } from '../../../types';
import { TopologyDataContext } from '../context/TopologyContext';
import { DRPCTable } from './AppSidebar';
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
  const protectedApps = React.useMemo(
    () => clusterAppsMap?.[resourceName] || [],
    [clusterAppsMap, resourceName]
  );
  const hasApps = protectedApps.length > 0;

  const conditions: K8sResourceCondition[] = resource.status?.conditions || [];
  const isHealthy = conditions.find(
    (c) => c.type === MANAGED_CLUSTER_CONDITION_AVAILABLE && c.status === 'True'
  );
  const version = resource.status?.version?.kubernetes || t('N/A');
  const clusterID =
    resource.spec?.clusterID || resource.status?.clusterID || t('N/A');
  const labels = getLabels(resource) || {};

  const drpcApps = React.useMemo(
    () =>
      protectedApps.map((app) => ({
        name: app.name,
        namespace: app.namespace,
        status: app.status,
        drPolicy: app.drPolicy,
      })),
    [protectedApps]
  );

  return (
    <div className="mco-topology-sidebar__container">
      <div className="mco-topology-sidebar__header">
        <Title
          headingLevel="h2"
          size="xl"
          className="mco-topology-sidebar__header-title pf-v6-u-mr-sm"
        >
          {resourceName}
        </Title>
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
            <div className="pf-v6-u-mt-md">
              {hasApps ? (
                <DRPCTable apps={drpcApps} />
              ) : (
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
