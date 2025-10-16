import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { useGetClusterDetails } from '@odf/core/redux/utils';
import { DataUnavailableError } from '@odf/shared/generic';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { ResourceProvidersBody } from './resource-providers-card-body';
import {
  ResourceProvidersItem,
  ProviderType,
} from './resource-providers-card-item';
import './resource-providers-card.scss';

const RESOURCE_PROVIDERS_QUERY = {
  PROVIDERS_TYPES: ' NooBaa_cloud_types',
  UNHEALTHY_PROVIDERS_TYPES: 'NooBaa_unhealthy_cloud_types',
};

const getProviderType = (provider: ProviderPrometheusData): string =>
  _.get(provider, 'metric.type', null);
const getProviderCount = (provider: ProviderPrometheusData): number =>
  Number(_.get(provider, 'value[1]', null));

const filterProviders = (allProviders: ProviderType): string[] => {
  return _.keys(allProviders).filter((provider) => allProviders[provider] > 0);
};

const createProvidersList = (data: PrometheusResponse): ProviderType => {
  const providers = _.get(data, 'data.result', null);
  const providersList: ProviderType = {};
  if (_.isNil(providers)) return {};
  providers.forEach((provider) => {
    providersList[getProviderType(provider)] = getProviderCount(provider);
  });
  return providersList;
};

const MCGResourceProvidersBody: React.FC = () => {
  const [providersTypesQueryResult, providersTypesQueryResultError] =
    useCustomPrometheusPoll({
      query: RESOURCE_PROVIDERS_QUERY.PROVIDERS_TYPES,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });
  const [
    unhealthyProvidersTypesQueryResult,
    unhealthyProvidersTypesQueryResultError,
  ] = useCustomPrometheusPoll({
    query: RESOURCE_PROVIDERS_QUERY.UNHEALTHY_PROVIDERS_TYPES,
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const error =
    !!providersTypesQueryResultError ||
    !!unhealthyProvidersTypesQueryResultError;

  const allProviders = createProvidersList(providersTypesQueryResult);
  const unhealthyProviders = createProvidersList(
    unhealthyProvidersTypesQueryResult
  );

  const providerTypes = filterProviders(allProviders);

  return (
    <ResourceProvidersBody
      isLoading={
        !error &&
        !(providersTypesQueryResult && unhealthyProvidersTypesQueryResult)
      }
      hasProviders={!_.isEmpty(allProviders)}
      error={error}
    >
      {providerTypes.map((provider) => (
        <ResourceProvidersItem
          count={allProviders[provider]}
          key={provider}
          title={provider}
          unhealthyProviders={unhealthyProviders}
        />
      ))}
    </ResourceProvidersBody>
  );
};

const ResourceProviders: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  const { clusterNamespace: clusterNs } = useGetClusterDetails();
  const { systemFlags } = useODFSystemFlagsSelector();
  const hasMCG = systemFlags[clusterNs]?.isNoobaaAvailable;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('Resource providers')}
          <FieldLevelHelp>
            {t(
              "A list of all Multicloud Object Gateway resources that are currently in use. Those resources are used to store data according to the buckets' policies and can be a cloud-based resource or a bare metal resource."
            )}
          </FieldLevelHelp>
        </CardTitle>
      </CardHeader>
      <CardBody>
        {hasMCG ? <MCGResourceProvidersBody /> : <DataUnavailableError />}
      </CardBody>
    </Card>
  );
};

type ProviderPrometheusData = {
  metric: { [key: string]: any };
  value?: [number, string | number];
};

export const ResourceProvidersCard = ResourceProviders;
