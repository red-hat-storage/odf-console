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
import {
  AlertItem,
  AlertsBody,
  HealthItem,
  usePrometheusPoll,
} from "badhikar-dynamic-plugin-sdk/internalAPI";
import {
  Alert,
  PrometheusLabels,
  PrometheusRule,
} from "badhikar-dynamic-plugin-sdk/lib/api/common-types";
import * as _ from "lodash";
export const AlertResource = {
  kind: "Alert",
  label: "Alert",
  plural: "/monitoring/alerts",
  abbr: "AL",
};

type Group = {
  rules: PrometheusRule[];
  file: string;
  name: string;
};

export type PrometheusRulesResponse = {
  data: {
    groups: Group[];
  };
  status: string;
};

export const labelsToParams = (labels: PrometheusLabels) =>
  _.map(
    labels,
    (v, k) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
  ).join("&");

export const filterCephAlerts = (alerts: Alert[]): Alert[] => {
  const rookRegex = /.*rook.*/;
  return alerts?.filter(
    (alert) =>
      alert?.annotations?.storage_type === "ceph" ||
      Object.values(alert?.labels)?.some((item) => rookRegex.test(item))
  );
};

const getAlertsFromPrometheusResponse = (response: PrometheusRulesResponse) => {
  const alerts: Alert[] = [];
  response?.data?.groups?.forEach((group) => {
    group.rules.forEach((rule) => {
      rule?.alerts?.forEach((alert) => {
        alerts.push({
          rule: {
            ...rule,
            id: group.name,
          },
          ...alert,
        });
      });
    });
  });
  return alerts;
};

const alertURL = (alert: Alert, ruleID: string) =>
  `${AlertResource.plural}/${ruleID}?${labelsToParams(alert.labels)}`;

const OCSAlerts: React.FC = () => {
  const [rules, alertsError, alertsLoaded] = usePrometheusPoll({
    query: "",
    endpoint: "api/v1/rules" as any,
  });
  const alerts = getAlertsFromPrometheusResponse(
    rules as unknown as PrometheusRulesResponse
  );
  const filteredAlerts = filterCephAlerts(alerts);
  return (
    <AlertsBody error={alertsError}>
      {!alertsLoaded &&
        filteredAlerts.length > 0 &&
        filteredAlerts.map((alert) => (
          <AlertItem key={alertURL(alert, alert.rule.id)} alert={alert} />
        ))}
    </AlertsBody>
  );
};

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
        <OCSAlerts />
      </CardBody>
    </Card>
  );
};
