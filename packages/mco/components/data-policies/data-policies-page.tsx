import * as React from 'react';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { HorizontalNav, useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { Helmet } from 'react-helmet';
import { RouteComponentProps } from 'react-router';
import { ACM_OBSERVABILITY_FLAG, ADMIN_FLAG } from '../../constants';
import { DRPolicyListPage } from '../drpolicy-list-page/drpolicy-list-page';
import DRDashboard from '../mco-dashboard/data-policy/dr-dashboard';

type DataPoliciesPageProps = {
  history: RouteComponentProps['history'];
};

export const DataPoliciesPage: React.FC<DataPoliciesPageProps> = () => {
  const { t } = useCustomTranslation();
  const title = t('Data policies');
  const acmMCOFlag = useFlag(ACM_OBSERVABILITY_FLAG);
  const adminFlag = useFlag(ADMIN_FLAG);
  const pages =
    // Enabling dashboard only when ACM observability is enabled and admin user is detected
    acmMCOFlag && adminFlag
      ? [
          {
            href: '',
            name: t('Overview'),
            component: DRDashboard,
          },
          {
            href: 'recovery',
            name: t('Disaster recovery'),
            component: DRPolicyListPage,
          },
        ]
      : [
          {
            href: '',
            name: t('Disaster recovery'),
            component: DRPolicyListPage,
          },
        ];

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <PageHeading title={title} />
      <HorizontalNav pages={pages} />
    </>
  );
};
