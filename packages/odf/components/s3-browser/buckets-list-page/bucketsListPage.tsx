import * as React from 'react';
import {
  EmptyBucketAlerts,
  EmptyBucketResponse,
} from '@odf/core/modals/s3-browser/delete-and-empty-bucket/EmptyBucketModal';
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
import { isCAError, CAErrorMessage } from '../ca-error/CAErrorMessage';
import { NoobaaS3Provider } from '../noobaa-context';
import { BucketsListTable } from './bucketListTable';
import { BucketPagination } from './bucketPagination';

type BucketInfo = [BucketCrFormat[], boolean, any];

type BucketsListPageBodyProps = {
  bucketInfo: BucketInfo;
  setBucketInfo: React.Dispatch<React.SetStateAction<BucketInfo>>;
};

const BucketsListPageBody: React.FC<BucketsListPageBodyProps> = ({
  bucketInfo,
  setBucketInfo,
}) => {
  const { t } = useCustomTranslation();
  const [fresh, triggerRefresh] = useRefresh();
  const [emptyBucketResponse, setEmptyBucketResponse] =
    React.useState<EmptyBucketResponse>({
      response: null,
      bucketName: '',
    });

  const [buckets, loaded, loadError] = bucketInfo;
  const [allBuckets, filteredBuckets, onFilterChange] =
    useListPageFilter(buckets);

  return (
    <ListPageBody>
      <EmptyBucketAlerts
        emptyBucketResponse={emptyBucketResponse}
        setEmptyBucketResponse={setEmptyBucketResponse}
        triggerRefresh={triggerRefresh}
      />
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
          setEmptyBucketResponse={setEmptyBucketResponse}
          triggerRefresh={triggerRefresh}
        />
      )}
    </ListPageBody>
  );
};

const BucketsListPageContent: React.FC = () => {
  const { t } = useCustomTranslation();
  const [bucketInfo, setBucketInfo] = React.useState<BucketInfo>([
    [],
    false,
    undefined,
  ]);
  const [_buckets, _loaded, loadError] = bucketInfo;

  if (isCAError(loadError)) {
    return <CAErrorMessage />;
  }

  return (
    <>
      <ListPageHeader title={t('Buckets')}>
        <ListPageCreateLink to={BUCKET_CREATE_PAGE_PATH}>
          {t('Create bucket')}
        </ListPageCreateLink>
      </ListPageHeader>
      <div className="pf-v5-u-ml-lg pf-v5-u-mr-lg text-muted">
        {t('Browse, upload, and manage objects in buckets.')}
      </div>
      <BucketsListPageBody
        bucketInfo={bucketInfo}
        setBucketInfo={setBucketInfo}
      />
    </>
  );
};

const BucketsListPage: React.FC = () => {
  return (
    <NoobaaS3Provider loading={false}>
      <BucketsListPageContent />
    </NoobaaS3Provider>
  );
};

export default BucketsListPage;
