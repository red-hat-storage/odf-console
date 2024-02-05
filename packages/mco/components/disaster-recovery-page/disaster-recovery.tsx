import * as React from 'react';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { HorizontalNav } from '@openshift-console/dynamic-plugin-sdk';
import { Helmet } from 'react-helmet';
import { Text, TextContent, TextVariants } from '@patternfly/react-core';
import { DRPolicyListPage } from '../drpolicy-list-page/drpolicy-list-page';
import DRDashboard from '../mco-dashboard/disaster-recovery/dr-dashboard';

const DisasterRecovery: React.FC = () => {
  const { t } = useCustomTranslation();
  const title = t('Disaster recovery');
  const pages = [
    // ToDo(issue RHSTOR-5377): Display DR getting started changes and dashboard under overview.
    // Also, Hide dashboard for non admin users.
    {
      href: '',
      name: t('Overview'),
      component: DRDashboard,
    },
    {
      href: 'policies',
      name: t('Policies'),
      component: DRPolicyListPage,
    },
  ];

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeading title={title}>
        <TextContent>
          <Text component={TextVariants.small}>
            {t(
              'Allows you to configure your business critical applications and provides the ability to recover from any disaster.'
            )}
          </Text>
        </TextContent>
      </PageHeading>
      <HorizontalNav pages={pages} />
    </>
  );
};

export default DisasterRecovery;
