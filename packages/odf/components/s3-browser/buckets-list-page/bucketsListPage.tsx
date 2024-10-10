import * as React from 'react';
import { useRefresh } from '@odf/shared/hooks';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidFilteredData } from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageCreateLink,
  ListPageFilter,
  ListPageHeader,
  useListPageFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import { Button, ButtonVariant, Flex, FlexItem } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { BUCKET_CREATE_PAGE_PATH } from '../../../constants';
import { BucketCrFormat } from '../../../types';
import { NoobaaS3Provider } from '../noobaa-context';
import { BucketsListTable } from './bucketListTable';
import { BucketPagination } from './bucketPagination';

const BucketsListPageBody: React.FC = () => {
  const { t } = useCustomTranslation();
  const [fresh, triggerRefresh] = useRefresh();
  const [bucketInfo, setBucketInfo] = React.useState<
    [BucketCrFormat[], boolean, any]
  >([[], false, undefined]);
  const [buckets, loaded, loadError] = bucketInfo;
  const [allBuckets, filteredBuckets, onFilterChange] =
    useListPageFilter(buckets);

  return (
    <ListPageBody>
      <Flex className="pf-v5-u-mt-md">
        <Flex flex={{ default: 'flex_1' }}>
          <FlexItem className="pf-v5-u-mr-md">
            <ListPageFilter
              loaded={true}
              hideLabelFilter={true}
              nameFilterPlaceholder={t('Search a bucket by name')}
              data={getValidFilteredData(allBuckets)}
              onFilterChange={onFilterChange}
            />
          </FlexItem>
          <FlexItem>
            <Button
              data-test="bucket-list-sync-button"
              variant={ButtonVariant.plain}
              onClick={triggerRefresh}
              isDisabled={!fresh}
            >
              <SyncAltIcon />
            </Button>
          </FlexItem>
        </Flex>
        <Flex>
          <FlexItem>
            {fresh && <BucketPagination setBucketInfo={setBucketInfo} />}
          </FlexItem>
        </Flex>
      </Flex>
      {fresh && (
        <BucketsListTable
          allBuckets={allBuckets}
          filteredBuckets={filteredBuckets}
          loaded={loaded}
          error={loadError}
        />
      )}
    </ListPageBody>
  );
};

const BucketsListPage: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <NoobaaS3Provider loading={false}>
      <ListPageHeader title={t('Buckets')}>
        <ListPageCreateLink to={BUCKET_CREATE_PAGE_PATH}>
          {t('Create bucket')}
        </ListPageCreateLink>
      </ListPageHeader>
      <div className="pf-v5-u-ml-lg pf-v5-u-mr-lg text-muted">
        {t('Browse, upload, and manage objects in buckets.')}
      </div>
      <BucketsListPageBody />
    </NoobaaS3Provider>
  );
};

export default BucketsListPage;
