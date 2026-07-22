import * as React from 'react';
import { IBM_SCALE_NAMESPACE } from '@odf/core/constants';
import useIsSANSystemDeletable from '@odf/core/hooks/useIsSANSystemDeletable';
import { ClusterKind } from '@odf/core/types/scale';
import {
  ClusterModel,
  Kebab,
  PageHeading,
  useCustomTranslation,
} from '@odf/shared';
import { ModalKeys } from '@odf/shared/modals';
import { referenceForModel } from '@odf/shared/utils';
import {
  Overview,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import { Grid, GridItem } from '@patternfly/react-core';
import ActivityCard from '../ibm-common/ActivityCard';
import CapacityCard from '../ibm-common/CapacityCard';
import LUNCard from './LUNCard';
import StatusCard from './StatusCard';

const sanDashboardActions = (
  t: TFunction,
  resource: ClusterKind | undefined,
  isSANSystemDeletable: boolean
) => {
  const canDelete = isSANSystemDeletable && !!resource;
  const actions = [
    {
      key: 'ADD_LUN_GROUP',
      value: t('Add LUN group'),
      component: React.lazy(
        () => import('../../modals/lun-group/AddLunGroupModal')
      ),
    },
    {
      key: ModalKeys.DELETE,
      value: t('Delete SAN_Storage'),
      description: isSANSystemDeletable
        ? undefined
        : t('Cannot be deleted if LUN groups exist.'),
      component: React.lazy(
        () => import('../../modals/san-system/DeleteSANSystemModal')
      ),
      isDisabled: !canDelete,
    },
  ];
  return (
    <Kebab
      extraProps={{
        resource,
        resourceModel: ClusterModel,
      }}
      customKebabItems={actions}
      toggleType="Dropdown"
      customLabel={'SAN Storage'}
      hideItems={[
        ModalKeys.EDIT_RES,
        ModalKeys.EDIT_ANN,
        ModalKeys.EDIT_LABELS,
      ]}
    />
  );
};

const SANDashboard: React.FC = () => {
  const { t } = useCustomTranslation();
  const isSANSystemDeletable = useIsSANSystemDeletable();
  const [localClusters] = useK8sWatchResource<ClusterKind[]>({
    kind: referenceForModel(ClusterModel),
    isList: true,
    namespace: IBM_SCALE_NAMESPACE,
  });
  const localCluster = localClusters?.[0];

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
        actions={() =>
          sanDashboardActions(t, localCluster, isSANSystemDeletable)
        }
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
