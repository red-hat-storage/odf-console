import * as React from 'react';
import PageHeading from '@odf/shared/heading/page-heading';
import { HorizontalNav } from '@openshift-console/dynamic-plugin-sdk';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router';
import { DRPolicyListPage } from './drpolicy-list-page/drpolicy-list-page';


type DataPoliciesListProps = {
  history: RouteComponentProps['history'];
};

export const DataPoliciesList: React.FC<DataPoliciesListProps> = (props) => {
  const { t } = useTranslation('plugin__odf-console');
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
