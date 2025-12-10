import * as React from 'react';
import {
  ClusterModel,
  Kebab,
  PageHeading,
  useCustomTranslation,
} from '@odf/shared';
import { ModalKeys } from '@odf/shared/modals';
import { Overview } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import { Grid, GridItem } from '@patternfly/react-core';
import ActivityCard from '../ibm-common/ActivityCard';
import CapacityCard from '../ibm-common/CapacityCard';
import LUNCard from './LUNCard';
import StatusCard from './StatusCard';

const sanDashboardActions = (t: TFunction) => {
  const actions = [
    {
      key: 'ADD_LUN_GROUP',
      value: t('Add LUN group'),
      component: React.lazy(
        () => import('../../modals/lun-group/AddLunGroupModal')
      ),
    },
  ];
  return (
    <Kebab
      extraProps={{
        resource: null,
        resourceModel: ClusterModel,
      }}
      customKebabItems={actions}
      toggleType="Dropdown"
      customLabel={'SAN Storage'}
      hideItems={[
        ModalKeys.EDIT_RES,
        ModalKeys.DELETE,
        ModalKeys.EDIT_ANN,
        ModalKeys.EDIT_LABELS,
      ]}
    />
  );
};

const SANDashboard: React.FC = () => {
  const { t } = useCustomTranslation();

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
        actions={() => sanDashboardActions(t)}
      />
      <Overview>
        <Grid hasGutter>
          <GridItem span={8}>
            <StatusCard />
          </GridItem>
          <GridItem span={4} rowSpan={3}>
            <ActivityCard />
          </GridItem>
          <GridItem span={8}>
            <CapacityCard />
          </GridItem>
          <GridItem span={8}>
            <LUNCard />
          </GridItem>
        </Grid>
      </Overview>
    </>
  );
};

export default SANDashboard;
