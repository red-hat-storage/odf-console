import * as React from "react";
import {
  K8sResourceCommon,
  WatchK8sResource,
} from "badhikar-dynamic-plugin-sdk";
import { useK8sWatchResource } from "badhikar-dynamic-plugin-sdk/api";
import { getCephHealthState, getOperatorHealthState } from "./utils";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Gallery,
  GalleryItem,
} from "@patternfly/react-core";
import { HealthItem } from "badhikar-dynamic-plugin-sdk/internalAPI";
/* export const CephAlerts = withDashboardResources(
  ({ watchAlerts, stopWatchAlerts, notificationAlerts }) => {
    React.useEffect(() => {
      watchAlerts();
      return () => {
        stopWatchAlerts();
      };
    }, [watchAlerts, stopWatchAlerts]);

    const { data, loaded, loadError } = notificationAlerts || {};
    const alerts = filterCephAlerts(data);

    return (
      <AlertsBody error={!_.isEmpty(loadError)}>
        {loaded &&
          alerts.length > 0 &&
          alerts.map((alert) => (
            <AlertItem key={alertURL(alert, alert.rule.id)} alert={alert} />
          ))}
      </AlertsBody>
    );
  }
);
*/
type K8sListKind = K8sResourceCommon & {
  items: K8sResourceCommon & {
    status?: any;
  };
};

const operatorResource: WatchK8sResource = {
  kind: "operators.coreos.com~v1alpha1~ClusterServiceVersion",
  namespace: "openshift-storage",
  isList: true,
};

const cephClusterResource: WatchK8sResource = {
  kind: "ceph.rook.io~v1~CephCluster",
  namespace: "openshift-storage",
  isList: true,
};

export const StatusCard: React.FC = () => {
  const [cephData, cephLoaded, cephLoadError] =
    useK8sWatchResource(cephClusterResource);

  const [csvData, csvLoaded, csvLoadError] =
    useK8sWatchResource<K8sListKind>(operatorResource);

  const operatorStatus = csvData?.[0]?.status?.phase;

  const cephHealthState = getCephHealthState({
    ceph: { data: cephData, loaded: cephLoaded, loadError: cephLoadError },
  });

  const operatorHealthStatus = getOperatorHealthState(
    operatorStatus,
    !csvLoaded,
    csvLoadError
  );

  return (
    <Card className="co-dashboard-card co-dashboard-card--gradient">
      <CardHeader className="co-dashboard-card__header">
        <CardTitle className="co-dashboard-card__title">Status</CardTitle>
      </CardHeader>
      <CardBody className="co-dashboard-card__body">
        <div className="co-dashboard-card__body--top-margin co-status-card__health-body">
          <Gallery className="co-overview-status__health" hasGutter>
            <GalleryItem>
              <HealthItem title="Operator" state={operatorHealthStatus.state} />
            </GalleryItem>
            <GalleryItem>
              <HealthItem
                title="Storage System"
                state={cephHealthState.state}
                details={cephHealthState.message}
              />
            </GalleryItem>
          </Gallery>
        </div>
      </CardBody>
    </Card>
  );
};
