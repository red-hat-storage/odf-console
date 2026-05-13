import * as React from 'react';
import { getVectorBucketCreatePageRoute } from '@odf/core/constants/s3-vectors';
import { ODF_ADMIN } from '@odf/core/features';
import { S3ProviderType } from '@odf/core/types';
import {
  ListPageFilterWrapper,
  useCustomTranslation,
  useModalWrapper,
  useRefresh,
} from '@odf/shared';
import { getValidFilteredData } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  ListPageBody,
  ListPageCreateLink,
  ListPageHeader,
  useFlag,
  useListPageFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import { Button, ButtonVariant, Flex, FlexItem } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { ActionsColumn } from '@patternfly/react-table';
import { ClientType } from '../../s3-common/types';
import { getAcountBadge, getAccountActionsItems } from '../../s3-common/utils';
import { S3VectorsContext } from '../s3-vectors-context';
import { VectorBucketsListTable } from './VectorBucketsListTable';
import { VectorBucketsPagination } from './VectorBucketsPagination';

type VectorBucketInfo = [K8sResourceCommon[], boolean, Error | undefined];

type VectorBucketsListPageBodyProps = {
  vectorBucketInfo: VectorBucketInfo;
  setVectorBucketInfo: React.Dispatch<React.SetStateAction<VectorBucketInfo>>;
};

const VectorBucketsListPageBody: React.FC<VectorBucketsListPageBodyProps> = ({
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
      <Flex className="pf-v6-u-mt-md">
        <Flex flex={{ default: 'flex_1' }}>
          <FlexItem className="pf-v6-u-mr-md">
            <ListPageFilterWrapper
              loaded={true}
              hideLabelFilter={true}
              nameFilterPlaceholder={t('Search a bucket by name')}
              data={getValidFilteredData(allVectorBuckets)}
              onFilterChange={onFilterChange}
            />
          </FlexItem>
          <FlexItem>
            <Button
              icon={<SyncAltIcon />}
              data-test="vector-buckets-list-sync-button"
              variant={ButtonVariant.plain}
              onClick={triggerRefresh}
              isDisabled={!fresh}
            />
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
          error={loadError as Error}
          triggerRefresh={triggerRefresh}
        />
      )}
    </ListPageBody>
  );
};
const VectorBucketsListPageContent: React.FC = () => {
  const { t } = useCustomTranslation();
  const [vectorBucketInfo, setVectorBucketInfo] =
    React.useState<VectorBucketInfo>([[], false, undefined]);
  const isAdmin = useFlag(ODF_ADMIN);
  const { s3VectorsClient, logout, setSecretRef } =
    React.useContext(S3VectorsContext);
  const launcher = useModalWrapper();
  const providerType = s3VectorsClient.providerType as S3ProviderType;
  return (
    <>
      <ListPageHeader
        title={t('Vector Buckets')}
        helpText={t('Create and manage your vector buckets')}
        {...(!isAdmin ? { badge: getAcountBadge(t) } : {})}
      >
        <ListPageCreateLink to={getVectorBucketCreatePageRoute(providerType)}>
          {t('Create bucket')}
        </ListPageCreateLink>
        {!isAdmin && (
          <ActionsColumn
            items={getAccountActionsItems(
              t,
              launcher,
              providerType,
              logout,
              setSecretRef,
              ClientType.S3_VECTOR
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
const VectorBucketsListPage: React.FC = () => <VectorBucketsListPageContent />;

export default VectorBucketsListPage;
