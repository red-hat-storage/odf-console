import * as React from 'react';
import {
  NooBaaObjectBucketClaimModel,
  NooBaaObjectBucketModel,
} from '@odf/core/models';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { RedExclamationCircleIcon } from '@odf/shared/status/icons';
import { K8sResourceKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import { getGaugeValue } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  InventoryItem,
} from '@openshift-console/dynamic-plugin-sdk';
import { usePrometheusPoll } from '@openshift-console/dynamic-plugin-sdk-internal';
import { ResourceInventoryItem } from '@openshift-console/dynamic-plugin-sdk-internal';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
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

const ObjectDashboardBucketsCard: React.FC<{}> = () => {
  const { t } = useTranslation();

  const [obcData, obcLoaded, obcLoadError] = useK8sWatchResource<
    K8sResourceKind[]
  >(objectBucketClaimsResource);
  const [obData, obLoaded, obLoadError] =
    useK8sWatchResource<K8sResourceKind[]>(objectBucketResource);

  const [noobaaCount, noobaaCountError] = usePrometheusPoll({
    query: BucketsCardQueries.BUCKETS_COUNT,
    endpoint: 'api/v1/query' as any,
  });
  const [noobaaObjectsCount, noobaaObjectsCountError] = usePrometheusPoll({
    query: BucketsCardQueries.BUCKET_OBJECTS_COUNT,
    endpoint: 'api/v1/query' as any,
  });
  const [unhealthyNoobaaBuckets, unhealthyNoobaaBucketsError] =
    usePrometheusPoll({
      query: BucketsCardQueries.UNHEALTHY_BUCKETS,
      endpoint: 'api/v1/query' as any,
    });

  const unhealthyNoobaaBucketsCount = Number(
    getGaugeValue(unhealthyNoobaaBuckets)
  );

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
        <InventoryItem
          // @ts-ignore (exposed type of this component is React.FC<{}>, hence giving error on passing props)
          isLoading={!(noobaaCount && unhealthyNoobaaBuckets)}
          error={!!(noobaaCountError || unhealthyNoobaaBucketsError)}
          title={t('NooBaa Bucket')}
          count={Number(getGaugeValue(noobaaCount))}
          TitleComponent={React.useCallback(
            (props) => (
              <BucketsTitle
                objects={noobaaObjectsCount}
                error={!!noobaaObjectsCountError}
                {...props}
              />
            ),
            [noobaaObjectsCount, noobaaObjectsCountError]
          )}
        >
          {unhealthyNoobaaBucketsCount > 0 && (
            <>
              <RedExclamationCircleIcon />
              <span className="nb-buckets-card__buckets-failure-status-count">
                {unhealthyNoobaaBucketsCount}
              </span>
            </>
          )}
        </InventoryItem>
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
