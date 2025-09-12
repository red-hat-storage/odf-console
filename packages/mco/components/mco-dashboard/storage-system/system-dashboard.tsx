import * as React from 'react';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { HorizontalNav } from '@openshift-console/dynamic-plugin-sdk';
import { Helmet } from 'react-helmet';
import { Grid, GridItem } from '@patternfly/react-core';
import { StatusCard } from './status-card/status-card';
import SystemCapacityCard from './system-capacity-card/capacity-card';
import '../../../style.scss';

const UpperSection: React.FC = () => (
  <Grid hasGutter>
    <GridItem md={12} sm={12}>
      <StatusCard />
    </GridItem>
    <GridItem md={12} sm={12}>
      <SystemCapacityCard />
    </GridItem>
  </Grid>
);

export const MCODashboard: React.FC = () => {
  return (
    <div className="odf-dashboard-body">
      <UpperSection />
    </div>
  );
};

const SystemDashboard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const title = t('Storage system');
  const pages = [
    {
      href: '',
      name: t('Overview'),
      component: MCODashboard,
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

export default SystemDashboard;
