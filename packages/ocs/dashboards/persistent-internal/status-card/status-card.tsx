import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { getResourceInNs as getCephClusterInNs } from '@odf/core/utils';
import { getCephHealthState } from '@odf/ocs/utils';
import { odfDocBasePath } from '@odf/shared/constants/doc';
import { healthStateMapping } from '@odf/shared/dashboards/status-card/states';
import { DOC_VERSION as odfDocVersion } from '@odf/shared/hooks';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { CephClusterModel } from '@odf/shared/models';
import useAlerts from '@odf/shared/monitoring/useAlert';
import { alertURL } from '@odf/shared/monitoring/utils';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { filterCephAlerts, referenceForModel } from '@odf/shared/utils';
import {
  Alert,
  HealthState,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  AlertItem,
  AlertsBody,
  HealthItem,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import { SubsystemHealth } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/dashboard-types';
import * as _ from 'lodash-es';
import { useParams } from 'react-router-dom-v5-compat';
import {
  Gallery,
  GalleryItem,
  Flex,
  FlexItem,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
} from '@patternfly/react-core';
import { DATA_RESILIENCY_QUERY, StorageDashboardQuery } from '../../../queries';
import { ODFSystemParams } from '../../../types';
import { getDataResiliencyState } from './utils';
import { whitelistedHealthChecksRef } from './whitelisted-health-checks';
import '../../../style.scss';
import './healthchecks.scss';

const resiliencyProgressQuery = (managedByOCS: string) =>
  DATA_RESILIENCY_QUERY(managedByOCS)[
    StorageDashboardQuery.RESILIENCY_PROGRESS
  ];

const generateDocumentationLink = (
  alert: Alert,
  docVersion: string
): string => {
  return `${odfDocBasePath(
    docVersion
  )}/troubleshooting_openshift_data_foundation/index#${_.toLower(
    alert?.labels?.alertname
  )}_rhodf`;
};

const isCephBasedAlert = (alert: Alert): boolean => {
  return alert?.annotations?.storage_type === 'ceph';
};

const getDocumentationLink = (alert: Alert, docVersion: string): string => {
  if (!!docVersion && isCephBasedAlert(alert)) {
    return generateDocumentationLink(alert, docVersion);
  }
  return null;
};

const CephAlerts: React.FC<{ docVersion: string }> = ({ docVersion }) => {
  const [alerts, loaded, error] = useAlerts();
  // ToDo (epic 4422): Get StorageCluster name and namespace from the Alert object
  // and filter Alerts based on that for a particular cluster.
  const filteredAlerts =
    loaded && !error && !_.isEmpty(alerts) ? filterCephAlerts(alerts) : [];

  return (
    <AlertsBody error={!_.isEmpty(error)}>
      {loaded &&
        filteredAlerts.length > 0 &&
        filteredAlerts?.map((alert) => (
          <AlertItem
            key={alertURL(alert, alert?.rule?.id)}
            alert={alert as any}
            documentationLink={getDocumentationLink(alert, docVersion)}
          />
        ))}
    </AlertsBody>
  );
};

const CephHealthCheck: React.FC<CephHealthCheckProps> = ({
  cephHealthState,
  healthCheck,
}) => {
  const { t } = useCustomTranslation();
  return (
    <Flex flexWrap={{ default: 'nowrap' }} direction={{ default: 'row' }}>
      <FlexItem>
        {
          (
            healthStateMapping[cephHealthState.state] ||
            healthStateMapping[HealthState.UNKNOWN]
          ).icon
        }
      </FlexItem>
      <FlexItem>
        <div data-test="healthcheck-message">{healthCheck?.details}</div>
      </FlexItem>
      <FlexItem>
        {!!healthCheck.troubleshootLink && (
          <a
            className="ceph-health-check-card__link"
            href={healthCheck.troubleshootLink}
          >
            {t('Troubleshoot')}
          </a>
        )}
      </FlexItem>
    </Flex>
  );
};

const cephClusterResource = {
  kind: referenceForModel(CephClusterModel),
  isList: true,
};

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [data, loaded, loadError] =
    useK8sWatchResource<K8sResourceKind[]>(cephClusterResource);

  const { namespace: clusterNs } = useParams<ODFSystemParams>();
  const { systemFlags } = useODFSystemFlagsSelector();
  const managedByOCS = systemFlags[clusterNs]?.ocsClusterName;

  const [resiliencyProgress, resiliencyProgressError] = useCustomPrometheusPoll(
    {
      query: resiliencyProgressQuery(managedByOCS),
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    }
  );

  const cephCluster = getCephClusterInNs(data, clusterNs);

  const cephHealthState = getCephHealthState(
    { ceph: { data: cephCluster, loaded, loadError } },
    t
  );
  const dataResiliencyState = getDataResiliencyState(
    [{ response: resiliencyProgress, error: resiliencyProgressError }],
    t
  );

  const pattern = /[A-Z]+_*|error/g;
  const healthChecks: CephHealthCheckType[] = [];
  const cephDetails = cephCluster?.status?.ceph?.details;
  for (const key in cephDetails) {
    if (pattern.test(key)) {
      const healthCheckObject: CephHealthCheckType = {
        id: key,
        details: cephDetails[key].message,
        ...(!!odfDocVersion
          ? {
              troubleshootLink:
                whitelistedHealthChecksRef(odfDocVersion)[key] ?? null,
            }
          : {}),
      };
      healthChecks.push(healthCheckObject);
    }
  }

  return (
    <Card className="odf-overview-card--gradient">
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <CardBody>
        <Gallery
          className="odf-overview-status__health pf-v5-u-mb-sm"
          hasGutter
        >
          <GalleryItem>
            <HealthItem
              title={t('Storage Cluster')}
              state={cephHealthState.state}
              details={cephHealthState.message}
              popupTitle={healthChecks ? t('Active health checks') : null}
            >
              {healthChecks?.map((healthCheck: CephHealthCheckType, i) => (
                <CephHealthCheck
                  key={`${i}`}
                  cephHealthState={cephHealthState}
                  healthCheck={healthCheck}
                />
              ))}
            </HealthItem>
          </GalleryItem>
          <GalleryItem>
            <HealthItem
              title={t('Data Resiliency')}
              state={dataResiliencyState.state}
              details={dataResiliencyState.message}
            />
          </GalleryItem>
        </Gallery>
        <CephAlerts docVersion={odfDocVersion} />
      </CardBody>
    </Card>
  );
};

export default StatusCard;

type CephHealthCheckType = {
  id: string;
  details: string;
  troubleshootLink?: string;
};

type CephHealthCheckProps = {
  cephHealthState: SubsystemHealth;
  healthCheck: CephHealthCheckType;
};
