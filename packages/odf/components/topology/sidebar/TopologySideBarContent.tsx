import * as React from 'react';
import { StorageClusterModel } from '@odf/ocs/models';
import { DetailsPageTitle } from '@odf/shared/details-page/DetailsPage';
import { LoadingBox } from '@odf/shared/generic/status-box';
import PageHeading from '@odf/shared/heading/page-heading';
import { DeploymentModel, NodeModel } from '@odf/shared/models';
import { nodeStatus } from '@odf/shared/status/Node';
import AlertsDetails from '@odf/shared/topology/sidebar/alerts/AlertsDetails';
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
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getGVKofResource } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  useK8sModel,
} from '@openshift-console/dynamic-plugin-sdk';
import { Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { filterFactory } from '../utils';
import {
  StorageClusterDetails,
  StorageClusterObserve,
  StorageClusterResources,
} from './storage-cluster';
import './topology-sidebar-content.scss';
import '@odf/shared/utils/tabs.scss';

type TopologySideBarContentProps = {
  resource: K8sResourceCommon;
  className?: string;
};

const AlertsTabComponent: React.FC<TopologySideBarContentProps> = ({
  resource,
}) => {
  const defaultFilter = React.useMemo(
    () => filterFactory(resource?.kind)(resource?.metadata?.name),
    [resource?.kind, resource?.metadata?.name]
  );
  return <AlertsDetails alertsFilter={defaultFilter} />;
};

type GenericTabComponentProps = {
  resource: K8sResourceCommon;
};

const DetailsTabComponent: React.FC<GenericTabComponentProps> = ({
  resource,
}) => {
  const kind = React.useMemo(() => resource?.kind, [resource?.kind]);
  const Component = React.useMemo(() => {
    switch (kind) {
      case NodeModel.kind:
        return NodeDetails;
      case DeploymentModel.kind:
        return DeploymentDetails;
      case StorageClusterModel.kind:
        return StorageClusterDetails;
    }
  }, [kind]);

  return <Component resource={resource as any} />;
};

const ResourceTabComponent: React.FC<GenericTabComponentProps> = ({
  resource,
}) => {
  const kind = React.useMemo(() => resource?.kind, [resource?.kind]);
  const Component = React.useMemo(() => {
    switch (kind) {
      case NodeModel.kind:
        return NodeResources;
      case DeploymentModel.kind:
        return DeploymentResources;
      case StorageClusterModel.kind:
        return StorageClusterResources;
    }
  }, [kind]);

  return <Component resource={resource as any} />;
};

const ObserveTabComponent: React.FC<GenericTabComponentProps> = ({
  resource,
}) => {
  const kind = React.useMemo(() => resource?.kind, [resource?.kind]);
  const Component = React.useMemo(() => {
    switch (kind) {
      case NodeModel.kind:
        return NodeObserve;
      case DeploymentModel.kind:
        return DeploymentObserve;
      case StorageClusterModel.kind:
        return StorageClusterObserve;
    }
  }, [kind]);

  return <Component resource={resource as any} />;
};

const TopologySideBarContent: React.FC<TopologySideBarContentProps> = ({
  resource,
  className,
}) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const { t } = useCustomTranslation();

  const getResourceStatus =
    resource.kind === NodeModel.kind ? nodeStatus : null;
  const reference = getGVKofResource(resource);
  const [model, inFlight] = useK8sModel(reference);

  const onSelect = React.useCallback(
    (event, tabIndex) => {
      setActiveTab(tabIndex);
    },
    [setActiveTab]
  );

  const title = <DetailsPageTitle resource={resource} resourceModel={model} />;

  return !inFlight ? (
    <div className={className}>
      <PageHeading
        title={title}
        resource={resource}
        getResourceStatus={getResourceStatus}
        className="odf-topology-sidebar-heading"
      />
      <Tabs
        activeKey={activeTab}
        onSelect={onSelect}
        unmountOnExit
        className="odf-tabs"
      >
        <Tab
          className="odf-topology-sidebar__tab"
          eventKey={0}
          title={<TabTitleText>{t('Alerts')}</TabTitleText>}
          translate={t}
        >
          <AlertsTabComponent resource={resource} />
        </Tab>
        <Tab
          className="odf-topology-sidebar__tab"
          eventKey={1}
          title={<TabTitleText>{t('Details')}</TabTitleText>}
          translate={t}
        >
          <DetailsTabComponent resource={resource} />
        </Tab>
        <Tab
          className="odf-topology-sidebar__tab"
          eventKey={2}
          title={<TabTitleText>{t('Resources')}</TabTitleText>}
          translate={t}
        >
          <ResourceTabComponent resource={resource} />
        </Tab>
        <Tab
          className="odf-topology-sidebar__tab"
          eventKey={3}
          title={<TabTitleText>{t('Observe')}</TabTitleText>}
          translate={t}
        >
          <ObserveTabComponent resource={resource} />
        </Tab>
      </Tabs>
    </div>
  ) : (
    <LoadingBox />
  );
};

export default TopologySideBarContent;
