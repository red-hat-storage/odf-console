import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Title,
  Label,
  Tab,
  Tabs,
  TabTitleText,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  List,
  ListItem,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { getClustersFromPairKey } from '../../../hooks/useDRPoliciesByClusterPair';
import './TopologySidebar.scss';

type DRPolicySidebarProps = {
  policies: any[];
  pairKey: string;
};

export const DRPolicySidebar: React.FC<DRPolicySidebarProps> = ({
  policies,
  pairKey,
}) => {
  const { t } = useCustomTranslation();
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(0);

  const [cluster1, cluster2] = getClustersFromPairKey(pairKey);
  const primaryPolicy = policies[0];
  const isConfiguring = primaryPolicy.isConfiguring;
  const isAvailable = primaryPolicy.phase === 'Available';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Header with policy name */}
      <div className="mco-topology-sidebar__header">
        <Title headingLevel="h2" size="xl" style={{ marginBottom: 0 }}>
          {primaryPolicy.name}
        </Title>
        {/* Add status badge */}
        <Label
          color={isConfiguring ? 'orange' : isAvailable ? 'green' : 'grey'}
          icon={isAvailable ? <CheckCircleIcon /> : undefined}
        >
          {primaryPolicy.phase}
        </Label>
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
                    {primaryPolicy.name}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Status')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label
                      color={
                        isConfiguring
                          ? 'orange'
                          : isAvailable
                            ? 'green'
                            : 'grey'
                      }
                      icon={isAvailable ? <CheckCircleIcon /> : undefined}
                    >
                      {primaryPolicy.phase}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>
                    {t('Connected clusters')}
                  </DescriptionListTerm>
                  <DescriptionListDescription>
                    <List isPlain>
                      <ListItem>{cluster1}</ListItem>
                      <ListItem>{cluster2}</ListItem>
                    </List>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {primaryPolicy.schedulingInterval && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>
                      {t('Scheduling interval')}
                    </DescriptionListTerm>
                    <DescriptionListDescription>
                      {primaryPolicy.schedulingInterval}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {primaryPolicy.replicationIntervalTime && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>
                      {t('Replication interval')}
                    </DescriptionListTerm>
                    <DescriptionListDescription>
                      {primaryPolicy.replicationIntervalTime}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {policies.length > 1 && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>
                      {t('Additional policies')}
                    </DescriptionListTerm>
                    <DescriptionListDescription>
                      <List isPlain>
                        {policies.slice(1).map((policy: any, index: number) => (
                          <ListItem key={`${policy.name}-${index}`}>
                            <div style={{ marginBottom: '8px' }}>
                              <div>
                                <strong>{policy.name}</strong>
                              </div>
                              <div style={{ marginTop: '4px' }}>
                                <Label
                                  color={
                                    policy.isConfiguring
                                      ? 'orange'
                                      : policy.phase === 'Available'
                                        ? 'green'
                                        : 'grey'
                                  }
                                  isCompact
                                >
                                  {policy.phase}
                                </Label>
                              </div>
                            </div>
                          </ListItem>
                        ))}
                      </List>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
};
