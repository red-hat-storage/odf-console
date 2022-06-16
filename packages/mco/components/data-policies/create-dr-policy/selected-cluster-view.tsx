import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants/common';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import {
  ODFStorageSystem,
  CephClusterModel,
  ClusterServiceVersionModel,
} from '@odf/shared/models';
import {
  ClusterServiceVersionKind,
  StorageSystemKind,
  ListKind,
  CephClusterKind,
} from '@odf/shared/types';
import { getODFCsv, getOCSStorageSystem } from '@odf/shared/utils';
import * as _ from 'lodash';
import {
  Text,
  Badge,
  TextContent,
  TextVariants,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { isMinimumSupportedODFVersion } from '../../../utils/disaster-recovery';
import { Cluster, DRPolicyAction, DRPolicyActionType } from './reducer';
import './create-dr-policy.scss';

type SelectedClusterProps = {
  id: number;
  cluster: Cluster;
  dispatch: React.Dispatch<DRPolicyAction>;
};

export const SelectedCluster: React.FC<SelectedClusterProps> = ({
  id,
  cluster,
  dispatch,
}) => {
  const { name, region, storageSystemName } = cluster;

  const [ssList, ssLoaded, ssLoadError] = useK8sGet<
    ListKind<StorageSystemKind>
  >(ODFStorageSystem, null, CEPH_STORAGE_NAMESPACE, name);

  const [cephClusterList, cephClusterLoaded, cephClusterLoadError] = useK8sGet<
    ListKind<CephClusterKind>
  >(CephClusterModel, null, CEPH_STORAGE_NAMESPACE, name);

  const [csvList, csvListLoaded, csvListLoadError] = useK8sGet<
    ListKind<ClusterServiceVersionKind>
  >(ClusterServiceVersionModel, null, CEPH_STORAGE_NAMESPACE, name);

  React.useEffect(() => {
    if (
      ssLoaded &&
      cephClusterLoaded &&
      csvListLoaded &&
      !(ssLoadError && cephClusterLoadError && csvListLoadError)
    ) {
      const storageSystem = getOCSStorageSystem(ssList?.items);
      const cephCluster = cephClusterList?.items?.[0];
      const operator = getODFCsv(csvList?.items);
      const odfVersion = operator?.spec?.version ?? '';
      const selectedClusters = {
        name,
        region,
        cephFSID: cephCluster?.status?.ceph?.fsid ?? '',
        storageSystemName: storageSystem?.metadata?.name ?? '',
        cephClusterName: storageSystem?.spec?.name ?? '',
        odfVersion: odfVersion,
        isValidODFVersion: isMinimumSupportedODFVersion(odfVersion),
        storageSystemLoaded: true,
        cephClusterLoaded: true,
        subscriptionLoaded: true,
      };
      dispatch({
        type: DRPolicyActionType.UPDATE_SELECTED_CLUSTERS,
        payload: selectedClusters,
      });
    }
  }, [
    name,
    region,
    cephClusterList,
    csvList,
    ssList,
    storageSystemName,
    ssLoaded,
    cephClusterLoaded,
    csvListLoaded,
    ssLoadError,
    cephClusterLoadError,
    csvListLoadError,
    dispatch,
  ]);

  return (
    <Flex
      display={{ default: 'inlineFlex' }}
      className="mco-create-data-policy__flex"
    >
      <FlexItem>
        <Badge key={id} isRead>
          {id}
        </Badge>
      </FlexItem>
      <FlexItem>
        <TextContent>
          <Text component={TextVariants.p}>{name}</Text>
          <Text component={TextVariants.small}>{region}</Text>
          <Text component={TextVariants.small}>{storageSystemName}</Text>
        </TextContent>
      </FlexItem>
    </Flex>
  );
};
