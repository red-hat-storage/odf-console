import * as React from 'react';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { HorizontalNav, useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { Helmet } from 'react-helmet';
import { Content, ContentVariants } from '@patternfly/react-core';
import { ADMIN_FLAG } from '../../constants';
import { DRPolicyListPage } from '../drpolicy-list-page/drpolicy-list-page';
import DRDashboard from '../mco-dashboard/disaster-recovery/dr-dashboard';
import { ProtectedApplicationsListPage } from '../protected-applications/list-page';

const DisasterRecovery: React.FC = () => {
  const { t } = useCustomTranslation();
  const isAdmin = useFlag(ADMIN_FLAG);

  const title = t('Disaster recovery');
  const pages = React.useMemo(
    () => [
      ...(isAdmin
        ? [
            {
              href: '',
              name: t('Overview'),
              component: DRDashboard,
            },
          ]
        : []),
      {
        href: isAdmin ? 'policies' : '',
        name: t('Policies'),
        component: DRPolicyListPage,
      },
      {
        href: 'protected-applications',
        name: t('Protected applications'),
        component: ProtectedApplicationsListPage,
      },
    ],
    [t, isAdmin]
  );

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeading title={title}>
        <Content>
          <Content component={ContentVariants.small}>
            {t(
              'Configure and recover your business critical applications in event of any disaster.'
            )}
          </Content>
        </Content>
      </PageHeading>
      <HorizontalNav pages={pages} />
    </>
  );
};

export default DisasterRecovery;
