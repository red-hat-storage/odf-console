import * as React from 'react';
import { getVectorBucketCreatePageRoute } from '@odf/core/constants/s3-vectors';
import { ODF_ADMIN } from '@odf/core/features';
import { S3ProviderType } from '@odf/core/types';
import { useCustomTranslation, useRefresh } from '@odf/shared';
import { getValidFilteredData } from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageCreateLink,
  ListPageFilter,
  ListPageHeader,
  useFlag,
  useListPageFilter,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { Button, ButtonVariant, Flex, FlexItem } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { ActionsColumn } from '@patternfly/react-table';
import { ClientType } from '../../s3-common/types';
import { getAcountBadge, getAccountActionsItems } from '../../s3-common/utils';
import { S3VectorsContext, S3VectorsProvider } from '../s3-vectors-context';
import { VectorBucketsListTable } from './VectorBucketsListTable';
import { VectorBucketsPagination } from './VectorBucketsPagination';

const VectorBucketsListPageBody = ({
  vectorBucketInfo,
  setVectorBucketInfo,
}) => {
  const { t } = useCustomTranslation();
  const [fresh, triggerRefresh] = useRefresh();
  const [vectorBuckets, loaded, loadError] = vectorBucketInfo;
  const [allVectorBuckets, filteredVectorBuckets, onFilterChange] =
    useListPageFilter(vectorBuckets);
  return (
    <ListPageBody>
      <Flex className="pf-v5-u-mt-md">
        <Flex flex={{ default: 'flex_1' }}>
          <FlexItem className="pf-v5-u-mr-md">
            <ListPageFilter
              loaded={true}
              hideLabelFilter={true}
              nameFilterPlaceholder={t('Search a bucket by name')}
              data={getValidFilteredData(allVectorBuckets)}
              onFilterChange={onFilterChange}
            />
          </FlexItem>
          <FlexItem>
            <Button
              data-test="vector-buckets-list-sync-button"
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
            {fresh && (
              <VectorBucketsPagination
                setVectorBucketInfo={setVectorBucketInfo}
              />
            )}
          </FlexItem>
        </Flex>
      </Flex>
      {fresh && (
        <VectorBucketsListTable
          allVectorBuckets={vectorBuckets}
          filteredVectorBuckets={filteredVectorBuckets}
          loaded={loaded}
          error={loadError}
          triggerRefresh={triggerRefresh}
        />
      )}
    </ListPageBody>
  );
};
const VectorBucketsListPageContent: React.FC = () => {
  const { t } = useCustomTranslation();
  const [vectorBucketInfo, setVectorBucketInfo] = React.useState([
    [],
    false,
    undefined,
  ]);
  const isAdmin = useFlag(ODF_ADMIN);
  const { logout, setSecretRef } = React.useContext(S3VectorsContext);
  const launcher = useModal();
  const providerType = S3ProviderType.Noobaa;
  return (
    <>
      <ListPageHeader
        title={t('Vector Buckets')}
        helpText={t('Browse, upload, and manage objects in buckets.')}
        {...(!isAdmin ? { badge: getAcountBadge(t) } : {})}
      >
        <ListPageCreateLink to={getVectorBucketCreatePageRoute(providerType)}>
          {t('Create vector bucket')}
        </ListPageCreateLink>
        {!isAdmin && (
          <ActionsColumn
            items={getAccountActionsItems(
              t,
              launcher,
              S3ProviderType.Noobaa,
              logout,
              setSecretRef,
              ClientType.S3_VECTORS
            )}
          />
        )}
      </ListPageHeader>
      <VectorBucketsListPageBody
        vectorBucketInfo={vectorBucketInfo}
        setVectorBucketInfo={setVectorBucketInfo}
      />
    </>
  );
};
const VectorBucketsListPage: React.FC = () => {
  return (
    <S3VectorsProvider>
      <VectorBucketsListPageContent />
    </S3VectorsProvider>
  );
};

export default VectorBucketsListPage;
