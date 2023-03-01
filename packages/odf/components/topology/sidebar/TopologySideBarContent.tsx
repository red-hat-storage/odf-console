import * as React from 'react';
import { StorageClusterModel } from '@odf/ocs/models';
import { DetailsPageTitle } from '@odf/shared/details-page/DetailsPage';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import { LoadingBox } from '@odf/shared/generic/status-box';
import PageHeading from '@odf/shared/heading/page-heading';
import { DeploymentModel, NodeModel } from '@odf/shared/models';
import { nodeStatus } from '@odf/shared/status/Node';
import TopologyAlerts from '@odf/shared/topology/sidebar/alerts/TopologyAlerts';
import {
  DeploymentDetails,
  DeploymentObserve,
  DeploymentResources,
} from '@odf/shared/topology/sidebar/deployments';
import {
  NodeDetails,
  NodeObserve,
  NodeResources,
} from '@odf/shared/topology/sidebar/node';
import { NodeKind, StorageClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getGVKofResource } from '@odf/shared/utils';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import {
  K8sResourceCommon,
  useK8sModel,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  StorageClusterDetails,
  StorageClusterObserve,
  StorageClusterResources,
} from './storage-cluster';
import './topology-sidebar-content.scss';

type TopologySideBarContentProps = {
  resource: K8sResourceCommon;
};

const TopologySideBarContent: React.FC<TopologySideBarContentProps> = ({
  resource,
}) => {
  const { t } = useCustomTranslation();
  const getResourceStatus =
    resource.kind === NodeModel.kind ? nodeStatus : null;
  const reference = getGVKofResource(resource);
  const [model, inFlight] = useK8sModel(reference);
  const [alertsTab, detailsTab, resourcesTab, observeTab]: JSX.Element[] =
    React.useMemo(() => {
      let [detailsTab, resourcesTab, observeTab] = Array(3)
        .fill(null)
        .map(() => <DataUnavailableError />);
      switch (resource.kind) {
        case NodeModel.kind:
          detailsTab = <NodeDetails node={resource as NodeKind} />;
          resourcesTab = <NodeResources node={resource as NodeKind} />;
          observeTab = <NodeObserve node={resource as NodeKind} />;
          break;
        case DeploymentModel.kind:
          detailsTab = <DeploymentDetails resource={resource as any} />;
          resourcesTab = <DeploymentResources deployment={resource as any} />;
          observeTab = <DeploymentObserve deployment={resource as any} />;
          break;
        case StorageClusterModel.kind:
          detailsTab = (
            <StorageClusterDetails
              storageCluster={resource as StorageClusterKind}
            />
          );
          resourcesTab = <StorageClusterResources />;
          observeTab = <StorageClusterObserve />;
          break;
      }
      const alertsTab = <TopologyAlerts resource={resource} />;
      return [alertsTab, detailsTab, resourcesTab, observeTab];
    }, [resource]);

  const tabs: TabPage[] = React.useMemo(
    () =>
      !inFlight
        ? [
            {
              title: t('Alerts'),
              href: '#sidebar-alerts',
              component: () => alertsTab,
            },
            {
              title: t('Details'),
              href: '#sidebar-details',
              component: () => detailsTab,
            },
            {
              title: t('Resources'),
              href: '#sidebar-resources',
              component: () => resourcesTab,
            },
            {
              title: t('Observe'),
              href: '#sidebar-observe',
              component: () => observeTab,
            },
          ]
        : [],
    [t, inFlight, alertsTab, detailsTab, resourcesTab, observeTab]
  );

  const title = <DetailsPageTitle resource={resource} resourceModel={model} />;

  return (
    <>
      <PageHeading
        title={title}
        resource={resource}
        getResourceStatus={getResourceStatus}
        className="odf-topology-sidebar-heading"
      />
      {tabs.length > 0 ? (
        <Tabs id="odf-topology-sidebar-tab-container" tabs={tabs} />
      ) : (
        <LoadingBox />
      )}
    </>
  );
};

export default TopologySideBarContent;
