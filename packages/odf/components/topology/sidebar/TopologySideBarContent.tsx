import * as React from 'react';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { DetailsPageTitle } from '@odf/shared/details-page/DetailsPage';
import { LoadingBox } from '@odf/shared/generic/status-box';
import PageHeading from '@odf/shared/heading/page-heading';
import useAutoExpand from '@odf/shared/hooks/useAutoExpand';
import {
  DeploymentModel,
  NodeModel,
  StorageClusterModel,
} from '@odf/shared/models';
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
import { OSDDetails } from '@odf/shared/topology/sidebar/node/OSDInformation';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getGVKofResource } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  NodeKind,
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
  shouldToggleToOSDInformation?: boolean;
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
  const { odfNamespace } = useODFNamespaceSelector();

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

  return <Component resource={resource as any} odfNamespace={odfNamespace} />;
};

const ObserveTabComponent: React.FC<GenericTabComponentProps> = ({
  resource,
}) => {
  const { odfNamespace } = useODFNamespaceSelector();

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

  return <Component resource={resource as any} odfNamespace={odfNamespace} />;
};

const TopologySideBarContent: React.FC<TopologySideBarContentProps> = ({
  resource,
  shouldToggleToOSDInformation,
}) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const { t } = useCustomTranslation();
  const getResourceStatus =
    resource?.kind === NodeModel.kind ? nodeStatus : null;
  const reference = getGVKofResource(resource);
  const [model, inFlight] = useK8sModel(reference);

  React.useEffect(() => {
    if (shouldToggleToOSDInformation) {
      setActiveTab(4);
    }
  }, [shouldToggleToOSDInformation]);

  const onSelect = React.useCallback(
    (_event, tabIndex) => {
      setActiveTab(tabIndex);
    },
    [setActiveTab]
  );

  const title = <DetailsPageTitle resource={resource} resourceModel={model} />;
  const { odfNamespace } = useODFNamespaceSelector();
  const shouldShowOSDInformation = resource?.kind === NodeModel.kind;

  const { ref, height } = useAutoExpand();

  return !inFlight && reference !== null ? (
    <div
      className="odf-topology__sidebar"
      ref={ref}
      style={{ height: `${height}px` }}
    >
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
        >
          <AlertsTabComponent resource={resource} />
        </Tab>
        <Tab
          className="odf-topology-sidebar__tab"
          eventKey={1}
          title={<TabTitleText>{t('Details')}</TabTitleText>}
        >
          <DetailsTabComponent resource={resource} />
        </Tab>
        <Tab
          className="odf-topology-sidebar__tab"
          eventKey={2}
          title={<TabTitleText>{t('Resources')}</TabTitleText>}
        >
          <ResourceTabComponent resource={resource} />
        </Tab>
        <Tab
          className="odf-topology-sidebar__tab"
          eventKey={3}
          title={<TabTitleText>{t('Observe')}</TabTitleText>}
        >
          <ObserveTabComponent resource={resource} />
        </Tab>
        {shouldShowOSDInformation && (
          <Tab
            className="odf-topology-sidebar__tab"
            eventKey={4}
            title={<TabTitleText>{t('OSD Information')}</TabTitleText>}
          >
            <OSDDetails
              resource={resource as NodeKind}
              odfNamespace={odfNamespace}
            />
          </Tab>
        )}
      </Tabs>
    </div>
  ) : (
    <LoadingBox />
  );
};

export default TopologySideBarContent;
