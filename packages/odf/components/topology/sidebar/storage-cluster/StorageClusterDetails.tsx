import * as React from 'react';
import { CEPH_STORAGE_LABEL } from '@odf/core/constants';
import { CEPH_FLAG, OCS_INDEPENDENT_FLAG } from '@odf/core/features';
import { nodeResource } from '@odf/core/resources';
import { CEPH_NS } from '@odf/ocs/constants';
import { getDataResiliencyState } from '@odf/ocs/dashboards/persistent-internal/status-card/utils';
import { StorageEfficiencyContent } from '@odf/ocs/dashboards/persistent-internal/storage-efficiency-card/storage-efficiency-card';
import { StorageClusterModel } from '@odf/ocs/models';
import { DATA_RESILIENCY_QUERY, StorageDashboardQuery } from '@odf/ocs/queries';
import { getCephNodes, getOperatorVersion } from '@odf/ocs/utils';
import {
  CEPH_STORAGE_NAMESPACE,
  DASH,
  ODF_OPERATOR,
} from '@odf/shared/constants';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import {
  ClusterServiceVersionModel,
  InfrastructureModel,
  NodeModel,
} from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { getNodeStatusGroups } from '@odf/shared/status/Inventory';
import { resourceStatus } from '@odf/shared/status/Resource';
import { Status } from '@odf/shared/status/Status';
import { NodeKind } from '@odf/shared/types';
import { K8sResourceKind, StorageClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  resourcePathFromModel,
  getInfrastructurePlatform,
} from '@odf/shared/utils';
import {
  useFlag,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  HealthItem,
  ResourceInventoryItem,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import * as _ from 'lodash-es';
import { Link } from 'react-router-dom';

const resiliencyProgressQuery =
  DATA_RESILIENCY_QUERY[StorageDashboardQuery.RESILIENCY_PROGRESS];

export type StorageClusterDetailsProps = {
  resource: StorageClusterKind;
};

export const StorageClusterDetails: React.FC<StorageClusterDetailsProps> = ({
  resource: storageCluster,
}) => {
  const { t } = useCustomTranslation();
  const [infrastructure, infrastructureLoaded, infrastructureError] =
    useK8sGet<K8sResourceKind>(InfrastructureModel, 'cluster');
  const [ocsData, ocsLoaded, ocsError] = useK8sList(
    StorageClusterModel,
    CEPH_NS
  );
  const cluster = ocsData?.find(
    (item: StorageClusterKind) => item.status.phase !== 'Ignored'
  );

  const ocsName = ocsLoaded && _.isEmpty(ocsError) ? getName(cluster) : DASH;
  const infrastructurePlatform =
    infrastructureLoaded && _.isEmpty(infrastructureError)
      ? getInfrastructurePlatform(infrastructure)
      : DASH;

  const [resiliencyProgress, resiliencyProgressError] = useCustomPrometheusPoll(
    {
      query: resiliencyProgressQuery,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    }
  );
  const dataResiliencyState = getDataResiliencyState(
    [{ response: resiliencyProgress, error: resiliencyProgressError }],
    t
  );

  const isIndependent = useFlag(OCS_INDEPENDENT_FLAG);
  const isCephAvailable = useFlag(CEPH_FLAG);
  const mode =
    !isIndependent && isCephAvailable ? t('Internal') : t('External');

  const [csv, csvLoaded, csvError] = useFetchCsv({
    specName: ODF_OPERATOR,
    namespace: CEPH_STORAGE_NAMESPACE,
  });
  const serviceVersion =
    csvLoaded && _.isEmpty(csvError) ? getOperatorVersion(csv) : DASH;
  const servicePath = `${resourcePathFromModel(
    ClusterServiceVersionModel,
    getName(csv),
    CEPH_NS
  )}`;
  const serviceName = t('Data Foundation');

  const [nodesData, nodesLoaded, nodesLoadError] =
    useK8sWatchResource<NodeKind[]>(nodeResource);
  const ocsNodesHref = `/search?kind=${NodeModel.kind}&q=${CEPH_STORAGE_LABEL}`;

  return (
    <div className="odf-m-pane__body">
      <SectionHeading text={t('Cluster details')} />
      <div className="row">
        <div className="col-md-5 col-xs-12">
          <dl>
            <dt>{t('Name')}</dt>
            <dd>{ocsName || DASH}</dd>
            <dt>{t('Data resiliency')}</dt>
            <dd>
              {' '}
              <HealthItem
                title=""
                state={dataResiliencyState.state}
                details={dataResiliencyState.message}
              />
            </dd>
            <dt>{t('Provider')}</dt>
            <dd>{infrastructurePlatform}</dd>
            <dt>{t('Mode')}</dt>
            <dd>{mode}</dd>
            <dt>{t('Version')}</dt>
            <dd>{serviceVersion}</dd>
            <dt>{t('Inventory')}</dt>
            <dd>
              <ResourceInventoryItem
                dataTest="inventory-nodes"
                isLoading={!nodesLoaded}
                error={!!nodesLoadError}
                kind={NodeModel as any}
                resources={getCephNodes(nodesData)}
                mapper={getNodeStatusGroups}
                basePath={ocsNodesHref}
              />
            </dd>
          </dl>
        </div>
        <div className="col-md-7 col-xs-12">
          <dl>
            <dt>{t('Status')}</dt>
            <dd>
              <Status status={resourceStatus(storageCluster)} />
            </dd>
            <dt>{t('Service name')}</dt>
            <dd className="text-capitalize">
              {csvLoaded && !csvError ? (
                <Link data-test="ocs-link" to={servicePath}>
                  {serviceName}
                </Link>
              ) : (
                serviceName
              )}
            </dd>
            <dt>{t('Storage efficiency')}</dt>
            <dd>
              <StorageEfficiencyContent />
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
};
