import * as React from 'react';
import { ODF_ADMIN } from '@odf/core/features';
import {
  EmptyBucketAlerts,
  EmptyBucketResponse,
} from '@odf/core/modals/s3-browser/delete-and-empty-bucket/EmptyBucketModal';
import { S3ProviderType } from '@odf/core/types';
import { useRefresh } from '@odf/shared/hooks';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidFilteredData, isClientPlugin } from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageCreateLink,
  ListPageFilter,
  ListPageHeader,
  useListPageFilter,
  useFlag,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { ActionsColumn } from '@patternfly/react-table';
import {
  BucketType,
  BUCKET_TYPE_ROUTES,
  getBucketCreatePageRoute,
} from '../../../constants';
import { BucketCrFormat } from '../../../types';
import {
  useSystemInfo,
  SystemInfoData,
} from '../../s3-common/hooks/useSystemInfo';
import { getAcountBadge, getAccountActionsItems } from '../../s3-common/utils';
import { S3VectorsProvider } from '../../s3-vectors/s3-vectors-context';
import VectorBucketsListPage from '../../s3-vectors/vector-buckets-list-page/VectorBucketsListPage';
import { S3Provider, S3Context } from '../s3-context';
import { BucketsListTable } from './bucketListTable';
import { BucketPagination } from './bucketPagination';

type BucketInfo = [BucketCrFormat[], boolean, any];

type BucketsListPageBodyProps = {
  bucketInfo: BucketInfo;
  setBucketInfo: React.Dispatch<React.SetStateAction<BucketInfo>>;
};

type StorageEndpointProps = {
  s3Provider: S3ProviderType;
  setS3Provider: React.Dispatch<React.SetStateAction<S3ProviderType>>;
  systemInfo: SystemInfoData;
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
      <Flex className="pf-v6-u-mt-md">
        <Flex flex={{ default: 'flex_1' }}>
          <FlexItem className="pf-v6-u-mr-md">
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
              icon={<SyncAltIcon />}
              data-test="bucket-list-sync-button"
              variant={ButtonVariant.plain}
              onClick={triggerRefresh}
              isDisabled={!fresh}
            />
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

  const isAdmin = useFlag(ODF_ADMIN);
  const { s3Client, logout, setSecretRef } = React.useContext(S3Context);
  const launcher = useModal();

  const providerType = s3Client.providerType as S3ProviderType;

  return (
    <>
      <ListPageHeader
        title={t('Buckets')}
        helpText={t('Browse, upload, and manage objects in buckets.')}
        {...(!isAdmin ? { badge: getAcountBadge(t) } : {})}
      >
        <ListPageCreateLink to={getBucketCreatePageRoute(providerType)}>
          {t('Create bucket')}
        </ListPageCreateLink>
        {!isAdmin && (
          <ActionsColumn
            items={getAccountActionsItems(
              t,
              launcher,
              providerType,
              logout,
              setSecretRef
            )}
          />
        )}
      </ListPageHeader>
      <BucketsListPageBody
        bucketInfo={bucketInfo}
        setBucketInfo={setBucketInfo}
      />
    </>
  );
};

const StorageEndpoint: React.FC<StorageEndpointProps> = ({
  s3Provider,
  setS3Provider,
  systemInfo = {},
}) => {
  const { t } = useCustomTranslation();

  const handleStorageEndpointSelect = (
    _event: React.MouseEvent,
    tabIndex: string
  ) => {
    setS3Provider(tabIndex as S3ProviderType);
  };

  // Only support secure (https) RGW endpoint (no http support)
  // In case both internal and external RGW are present (multi-cluster scenario), select internal only
  // No external RGW support yet (only internal)
  const isInternalRgw = Object.values(systemInfo || []).some(
    (info) =>
      info.isInternalMode && info.isRGWAvailable && info.rgwSecureEndpoint
  );

  return (
    <Tabs
      activeKey={s3Provider}
      onSelect={handleStorageEndpointSelect}
      aria-label={t('Storage endpoint selection')}
      id="odf-storage-endpoint-tabs"
      unmountOnExit
    >
      <Tab
        eventKey={S3ProviderType.Noobaa}
        title={
          <TabTitleText>{t('MultiCloud Object Gateway (MCG)')}</TabTitleText>
        }
        aria-label={t('MCG endpoint')}
      />
      <Tab
        eventKey={S3ProviderType.RgwInt}
        title={<TabTitleText>{t('RADOS Object Gateway (RGW)')}</TabTitleText>}
        isDisabled={!isInternalRgw}
        aria-label={t('RGW endpoint')}
      />
    </Tabs>
  );
};

const BucketsListPage: React.FC = () => {
  const { t } = useCustomTranslation();

  const [s3Provider, setS3Provider] = React.useState(S3ProviderType.Noobaa);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: systemInfo, isLoading } = useSystemInfo();
  const isClientCluster = isClientPlugin();

  const activeBucketTab =
    s3Provider === S3ProviderType.Noobaa &&
    pathname === BUCKET_TYPE_ROUTES[BucketType.S3Vector]
      ? BucketType.S3Vector
      : BucketType.General;

  const handleTabSelect = (_event: React.MouseEvent, tabIndex: string) => {
    const route = BUCKET_TYPE_ROUTES[tabIndex];
    if (route) navigate(route);
  };

  return (
    <>
      <StorageEndpoint
        s3Provider={s3Provider}
        setS3Provider={setS3Provider}
        systemInfo={systemInfo}
      />
      {!isClientCluster && s3Provider === S3ProviderType.Noobaa ? (
        <Tabs
          id="odf-object-storage-bucket-type-subtabs"
          activeKey={activeBucketTab}
          onSelect={handleTabSelect}
          unmountOnExit
          aria-label={t('Bucket types')}
          variant="secondary"
        >
          <Tab
            eventKey={BucketType.General}
            title={<TabTitleText>{t('General')}</TabTitleText>}
            aria-label={t('General')}
          >
            <S3Provider loading={isLoading} s3Provider={S3ProviderType.Noobaa}>
              <BucketsListPageContent />
            </S3Provider>
          </Tab>
          <Tab
            eventKey={BucketType.S3Vector}
            title={<TabTitleText>{t('S3 Vector')}</TabTitleText>}
            aria-label={t('S3 Vector')}
          >
            <S3VectorsProvider loading={isLoading}>
              <VectorBucketsListPage />
            </S3VectorsProvider>
          </Tab>
        </Tabs>
      ) : (
        <S3Provider loading={isLoading} s3Provider={s3Provider}>
          <BucketsListPageContent />
        </S3Provider>
      )}
    </>
  );
};

export default BucketsListPage;
