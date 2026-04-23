import * as React from 'react';
import { getDRPolicyStatus, isDRPolicyValidated } from '@odf/mco/utils';
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
import {
  DRPolicyInfo,
  getClustersFromPairKey,
} from '../../../hooks/useDRPoliciesByClusterPair';
import './TopologySidebar.scss';

type DRPolicySidebarProps = {
  policies: DRPolicyInfo[];
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
  const isValidated = isDRPolicyValidated(primaryPolicy.policy);
  const isConfiguring = primaryPolicy.isConfiguring;

  return (
    <div className="mco-topology-sidebar__container">
      <div className="mco-topology-sidebar__header">
        <Title
          headingLevel="h2"
          size="xl"
          className="mco-topology-sidebar__header-title pf-v6-u-mr-sm"
        >
          {primaryPolicy.name}
        </Title>
        <Label
          color={isValidated ? 'green' : isConfiguring ? 'orange' : 'red'}
          icon={isValidated ? <CheckCircleIcon /> : undefined}
        >
          {!isConfiguring
            ? getDRPolicyStatus(isValidated, t)
            : t('Configuring')}
        </Label>
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
                    {primaryPolicy.name}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>{t('Status')}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label
                      color={
                        isValidated ? 'green' : isConfiguring ? 'orange' : 'red'
                      }
                      icon={isValidated ? <CheckCircleIcon /> : undefined}
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
                {policies.length > 1 && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>
                      {t('Additional policies')}
                    </DescriptionListTerm>
                    <DescriptionListDescription>
                      <List isPlain>
                        {policies.slice(1).map((policy, index) => (
                          <ListItem key={`${policy.name}-${index}`}>
                            <div className="mco-topology-sidebar__policy-item">
                              <div>
                                <strong>{policy.name}</strong>
                              </div>
                              <div className="mco-topology-sidebar__policy-phase">
                                <Label
                                  color={isConfiguring ? 'orange' : 'green'}
                                  icon={
                                    !isConfiguring ? (
                                      <CheckCircleIcon />
                                    ) : undefined
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
