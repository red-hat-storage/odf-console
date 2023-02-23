import * as React from 'react';
import AlertsPanel from '@odf/shared/alert/AlertsPanel';
import { DetailsPageTitle } from '@odf/shared/details-page/DetailsPage';
import { LoadingBox } from '@odf/shared/generic/status-box';
import PageHeading from '@odf/shared/heading/page-heading';
import { NodeModel } from '@odf/shared/models';
import { nodeStatus } from '@odf/shared/status/Node';
import { NodeKind } from '@odf/shared/types';
import { getGVKofResource } from '@odf/shared/utils';
import {
  Alert,
  K8sResourceCommon,
  useK8sModel,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { useCustomTranslation } from '../../useCustomTranslationHook';
import Tabs, { TabPage } from '../../utils/Tabs';
import NodeDetails from './node/NodeDetails';
import NodeObserve from './node/NodeObserve';
import NodeResources from './node/NodeResources';
import './topology-sidebar-content.scss';
import { AlertsResponse } from './types';

type TopologySideBarContentProps = {
  alertsResponse: AlertsResponse;
  resource: K8sResourceCommon;
};

const TopologySideBarContent: React.FC<TopologySideBarContentProps> = ({
  alertsResponse,
  resource,
}) => {
  const { t } = useCustomTranslation();
  const getResourceStatus = resource.kind === 'Node' ? nodeStatus : null;
  const reference = getGVKofResource(resource);
  const [model, inFlight] = useK8sModel(reference);
  const [alertsTab, detailsTab, resourcesTab, observeTab]: JSX.Element[] =
    React.useMemo(() => {
      const defaultAlertsFilter = (alert: Alert) =>
        _.get(alert, 'annotations.description', '').includes(
          resource.metadata.name
        ) ||
        _.get(alert, 'annotations.message', '').includes(
          resource.metadata.name
        );
      let alertsFilter = defaultAlertsFilter;
      let [detailsTab, resourcesTab, observeTab] = Array(3)
        .fill(null)
        .map(() => <span>N/A</span>);
      switch (resource.kind) {
        case NodeModel.kind:
          alertsFilter = (alert: Alert) =>
            alert?.labels?.node === resource.metadata.name ||
            defaultAlertsFilter(alert);
          detailsTab = <NodeDetails node={resource as NodeKind} />;
          resourcesTab = <NodeResources node={resource as NodeKind} />;
          observeTab = <NodeObserve node={resource as NodeKind} />;
          break;
      }
      const alertsTab = (
        <AlertsPanel
          alerts={alertsResponse.alerts}
          loaded={alertsResponse.loaded}
          loadError={alertsResponse.loadError}
          alertsFilter={alertsFilter}
        />
      );
      return [alertsTab, detailsTab, resourcesTab, observeTab];
    }, [resource, alertsResponse]);

  const tabs: TabPage[] = React.useMemo(
    () =>
      !inFlight && alertsResponse.loaded && _.isEmpty(alertsResponse.loadError)
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
    [
      t,
      inFlight,
      alertsResponse,
      alertsTab,
      detailsTab,
      resourcesTab,
      observeTab,
    ]
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
