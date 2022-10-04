import * as React from 'react';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { HorizontalNav } from '@openshift-console/dynamic-plugin-sdk';
import { Helmet } from 'react-helmet';
import { RouteComponentProps } from 'react-router';
import { DRPolicyListPage } from '../../disaster-recovery/drpolicy-list-page/drpolicy-list-page';

type DataPoliciesListProps = {
  history: RouteComponentProps['history'];
};

export const DataPoliciesList: React.FC<DataPoliciesListProps> = () => {
  const { t } = useCustomTranslation();
  const title = t('Data policies');
  const pages = [
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
