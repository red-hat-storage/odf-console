import * as React from 'react';
import { pluralize } from '@odf/core/components/utils';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import {
  NooBaaObjectBucketClaimModel,
  NooBaaObjectBucketModel,
} from '@odf/shared';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { RedExclamationCircleIcon } from '@odf/shared/status/icons';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { getGaugeValue } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  InventoryItem,
  InventoryItemLoading,
  InventoryItemBody,
  PrometheusResponse,
} from '@openshift-console/dynamic-plugin-sdk';
import { ResourceInventoryItem } from '@openshift-console/dynamic-plugin-sdk-internal';
import { useParams } from 'react-router-dom-v5-compat';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { ODFSystemParams } from '../../../types';
import { BucketsTitle } from './buckets-card-item';
import { getObcStatusGroups, getObStatusGroups } from './utils';
import './buckets-card.scss';

enum BucketsCardQueries {
  BUCKETS_COUNT = 'NooBaa_num_buckets',
  BUCKET_OBJECTS_COUNT = 'NooBaa_num_objects',
  UNHEALTHY_BUCKETS = 'NooBaa_num_unhealthy_buckets',
}

const objectBucketClaimsResource = {
  kind: referenceForModel(NooBaaObjectBucketClaimModel),
  namespaced: false,
  isList: true,
};

const objectBucketResource = {
  kind: referenceForModel(NooBaaObjectBucketModel),
  namespaced: false,
  isList: true,
};

type ObjectInventoryItemProps = {
  isLoading: boolean;
  title: string;
  titlePlural?: string;
  count: number;
  children?: React.ReactNode;
  error?: boolean;
  objectCount?: PrometheusResponse;
  objectCountError?: boolean;
};

const ObjectInventoryItem: React.FC<ObjectInventoryItemProps> = ({
  isLoading,
  title,
  titlePlural,
  count,
  children,
  error = false,
  objectCount,
  objectCountError,
}) => {
  const titleMessage = pluralize(
    count,
    title,
    titlePlural,
    !isLoading && !error
  );
  return (
    <InventoryItem>
      <div className="co-inventory-card__item-title">
        {isLoading && !error && <InventoryItemLoading />}
        <BucketsTitle objects={objectCount} error={objectCountError}>
          {titleMessage}
        </BucketsTitle>
      </div>
      <InventoryItemBody error={error}>{children}</InventoryItemBody>
    </InventoryItem>
  );
};

const MCGObjectInventoryItem: React.FC = () => {
  const { t } = useCustomTranslation();

  const [noobaaCount, noobaaCountError] = useCustomPrometheusPoll({
    query: BucketsCardQueries.BUCKETS_COUNT,
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [noobaaObjectsCount, noobaaObjectsCountError] = useCustomPrometheusPoll(
    {
      query: BucketsCardQueries.BUCKET_OBJECTS_COUNT,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    }
  );
  const [unhealthyNoobaaBuckets, unhealthyNoobaaBucketsError] =
    useCustomPrometheusPoll({
      query: BucketsCardQueries.UNHEALTHY_BUCKETS,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const unhealthyNoobaaBucketsCount = Number(
    getGaugeValue(unhealthyNoobaaBuckets)
  );

  return (
    <ObjectInventoryItem
      isLoading={!(noobaaCount && unhealthyNoobaaBuckets)}
      error={!!(noobaaCountError || unhealthyNoobaaBucketsError)}
      title={t('NooBaa Bucket')}
      count={Number(getGaugeValue(noobaaCount))}
      objectCount={noobaaObjectsCount}
      objectCountError={!!noobaaObjectsCountError}
    >
      {unhealthyNoobaaBucketsCount > 0 && (
        <>
          <RedExclamationCircleIcon />
          <span className="nb-buckets-card__buckets-failure-status-count">
            {unhealthyNoobaaBucketsCount}
          </span>
        </>
      )}
    </ObjectInventoryItem>
  );
};

const ObjectDashboardBucketsCard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  const { namespace: clusterNs } = useParams<ODFSystemParams>();
  const { systemFlags } = useODFSystemFlagsSelector();
  const isMCGSupported = systemFlags[clusterNs]?.isNoobaaAvailable;

  const [obcData, obcLoaded, obcLoadError] = useK8sWatchResource<
    K8sResourceKind[]
  >(objectBucketClaimsResource);
  const [obData, obLoaded, obLoadError] =
    useK8sWatchResource<K8sResourceKind[]>(objectBucketResource);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('Buckets')}
          <FieldLevelHelp>
            {t(
              'Buckets card represents the number of S3 buckets managed on Multicloud Object Gateway and the number of ObjectBucketClaims and the ObjectBuckets managed on both Multicloud Object Gateway and RGW (if deployed).'
            )}
          </FieldLevelHelp>
        </CardTitle>
      </CardHeader>
      <CardBody>
        {isMCGSupported && <MCGObjectInventoryItem />}
        <ResourceInventoryItem
          isLoading={!obLoaded}
          error={!!obLoadError}
          kind={NooBaaObjectBucketModel as any}
          resources={obData}
          mapper={getObStatusGroups}
        />
        <ResourceInventoryItem
          dataTest="resource-inventory-item-obc"
          isLoading={!obcLoaded}
          error={!!obcLoadError}
          kind={NooBaaObjectBucketClaimModel as any}
          resources={obcData}
          mapper={getObcStatusGroups}
        />
      </CardBody>
    </Card>
  );
};

export const BucketsCard = ObjectDashboardBucketsCard;
