import * as React from 'react';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import {
  Overview,
  OverviewGrid,
  OverviewGridCard,
} from '@openshift-console/dynamic-plugin-sdk';
import ActivityCard from '../ibm-common/ActivityCard';
import CapacityCard from '../ibm-common/CapacityCard';
import LUNCard from './LUNCard';
import StatusCard from './StatusCard';

const SANDashboard: React.FC = () => {
  const { t } = useCustomTranslation();
  const mainCards: OverviewGridCard[] = [
    { Card: StatusCard },
    { Card: CapacityCard },
    { Card: LUNCard },
  ];

  const rightCards: OverviewGridCard[] = [{ Card: ActivityCard }];

  return (
    <>
      <PageHeading
        title={t('Scale Dashboard')}
        hasUnderline={false}
        breadcrumbs={[
          {
            name: t('External systems'),
            path: '/odf/external-systems',
          },
          {
            name: t('IBM SAN'),
            path: '',
          },
        ]}
      />
      <Overview>
        <OverviewGrid mainCards={mainCards} rightCards={rightCards} />
      </Overview>
    </>
  );
};

export default SANDashboard;
