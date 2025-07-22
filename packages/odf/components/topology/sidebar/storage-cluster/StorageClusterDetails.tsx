import * as React from 'react';
import { cephStorageLabel } from '@odf/core/constants';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { nodeResource } from '@odf/core/resources';
import { StorageEfficiencyContent } from '@odf/ocs/dashboards/persistent-internal/storage-efficiency-card/storage-efficiency-card';
import { DATA_RESILIENCY_QUERY, StorageDashboardQuery } from '@odf/ocs/queries';
import { getCephNodes, getDataResiliencyState } from '@odf/ocs/utils';
import {
  DASH,
  DEFAULT_INFRASTRUCTURE,
  ODF_OPERATOR,
} from '@odf/shared/constants';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import {
  ClusterServiceVersionModel,
  InfrastructureModel,
  NodeModel,
} from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { getNodeStatusGroups } from '@odf/shared/status/Inventory';
import { resourceStatus } from '@odf/shared/status/Resource';
import { Status } from '@odf/shared/status/Status';
import { InfrastructureKind, NodeKind } from '@odf/shared/types';
import { StorageClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getOprVersionFromCSV } from '@odf/shared/utils';
import {
  resourcePathFromModel,
  getInfrastructurePlatform,
} from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  HealthItem,
  ResourceInventoryItem,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import * as _ from 'lodash-es';
import { Link } from 'react-router-dom-v5-compat';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
} from '@patternfly/react-core';

const resiliencyProgressQuery = (managedByOCS: string) =>
  DATA_RESILIENCY_QUERY(managedByOCS)[
    StorageDashboardQuery.RESILIENCY_PROGRESS
  ];

export type StorageClusterDetailsProps = {
  resource: StorageClusterKind;
};

export const StorageClusterDetails: React.FC<StorageClusterDetailsProps> = ({
  resource: storageCluster,
}) => {
  const { t } = useCustomTranslation();

  const { odfNamespace, isNsSafe } = useODFNamespaceSelector();

  const [infrastructure, infrastructureLoaded, infrastructureError] =
    useK8sGet<InfrastructureKind>(InfrastructureModel, DEFAULT_INFRASTRUCTURE);

  const ocsName = getName(storageCluster);
  const infrastructurePlatform =
    infrastructureLoaded && _.isEmpty(infrastructureError)
      ? getInfrastructurePlatform(infrastructure)
      : DASH;

  const [resiliencyProgress, resiliencyProgressError] = useCustomPrometheusPoll(
    {
      query: resiliencyProgressQuery(ocsName),
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    }
  );
  const dataResiliencyState = getDataResiliencyState(
    [{ response: resiliencyProgress, error: resiliencyProgressError }],
    t
  );

  // Topology is only supported for Internal mode
  const mode = t('Internal');

  const [csv, csvLoaded, csvError] = useFetchCsv({
    specName: ODF_OPERATOR,
    namespace: odfNamespace,
    startPollingInstantly: isNsSafe,
  });
  const serviceVersion =
    csvLoaded && _.isEmpty(csvError) ? getOprVersionFromCSV(csv) : DASH;
  const servicePath = `${resourcePathFromModel(
    ClusterServiceVersionModel,
    getName(csv),
    odfNamespace
  )}`;
  const serviceName = t('Data Foundation');

  const [nodesData, nodesLoaded, nodesLoadError] =
    useK8sWatchResource<NodeKind[]>(nodeResource);
  const storageLabel = cephStorageLabel(odfNamespace);
  const ocsNodesHref = `/search?kind=${NodeModel.kind}&q=${storageLabel}`;

  return (
    <div className="odf-m-pane__body">
      <SectionHeading text={t('Cluster details')} />
      <div className="row">
        <div className="col-md-5 col-xs-12">
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Name')}</DescriptionListTerm>
              <DescriptionListDescription>
                {ocsName || DASH}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Data resiliency')}</DescriptionListTerm>
              <DescriptionListDescription>
                {' '}
                <HealthItem
                  title=""
                  state={dataResiliencyState.state}
                  details={dataResiliencyState.message}
                />
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Provider')}</DescriptionListTerm>
              <DescriptionListDescription>
                {infrastructurePlatform}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Mode')}</DescriptionListTerm>
              <DescriptionListDescription>{mode}</DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Version')}</DescriptionListTerm>
              <DescriptionListDescription>
                {serviceVersion}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Inventory')}</DescriptionListTerm>
              <DescriptionListDescription>
                <ResourceInventoryItem
                  dataTest="inventory-nodes"
                  isLoading={!nodesLoaded}
                  error={!!nodesLoadError}
                  kind={NodeModel as any}
                  resources={getCephNodes(nodesData, odfNamespace)}
                  mapper={getNodeStatusGroups}
                  basePath={ocsNodesHref}
                />
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </div>
        <div className="col-md-7 col-xs-12">
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Status')}</DescriptionListTerm>
              <DescriptionListDescription>
                <Status status={resourceStatus(storageCluster)} />
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>{t('Service name')}</DescriptionListTerm>
              <DescriptionListDescription className="text-capitalize">
                {isNsSafe && csvLoaded && !csvError ? (
                  <Link data-test="ocs-link" to={servicePath}>
                    {serviceName}
                  </Link>
                ) : (
                  serviceName
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>

            <DescriptionListGroup>
              <DescriptionListTerm>
                {t('Storage efficiency')}
              </DescriptionListTerm>
              <DescriptionListDescription>
                <StorageEfficiencyContent />
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </div>
      </div>
    </div>
  );
};
