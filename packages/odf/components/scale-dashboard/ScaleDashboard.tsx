import * as React from 'react';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import {
  Overview,
  OverviewGrid,
  OverviewGridCard,
} from '@openshift-console/dynamic-plugin-sdk';
import ActivityCard from './ActivityCard';
import CapacityCard from './CapacityCard';
import DetailsCard from './DetailsCard';
import FileSystemCard from './FileSystems';
import StatusCard from './StatusCard';

const ScaleDashboard: React.FC = () => {
  const { t } = useCustomTranslation();
  const mainCards: OverviewGridCard[] = [
    { Card: StatusCard },
    { Card: CapacityCard },
    { Card: FileSystemCard },
  ];

  const leftCards: OverviewGridCard[] = [{ Card: DetailsCard }];

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
            name: t('IBM Scale'),
            path: '',
          },
        ]}
      />
      <Overview>
        <OverviewGrid
          mainCards={mainCards}
          leftCards={leftCards}
          rightCards={rightCards}
        />
      </Overview>
    </>
  );
};

export default ScaleDashboard;
