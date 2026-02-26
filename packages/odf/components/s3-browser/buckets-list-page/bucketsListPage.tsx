import * as React from 'react';
import { VECTOR_BUCKETS_BASE_ROUTE } from '@odf/core/constants/s3-vectors';
import { ODF_ADMIN } from '@odf/core/features';
import {
  EmptyBucketAlerts,
  EmptyBucketResponse,
} from '@odf/core/modals/s3-browser/delete-and-empty-bucket/EmptyBucketModal';
import { S3ProviderType } from '@odf/core/types';
import { useRefresh } from '@odf/shared/hooks';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidFilteredData } from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageCreateLink,
  ListPageFilter,
  ListPageHeader,
  useListPageFilter,
  useFlag,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Card,
  CardHeader,
  CardTitle,
  FormGroup,
  TextContent,
  Text,
  TextVariants,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { ActionsColumn } from '@patternfly/react-table';
import {
  BUCKETS_BASE_ROUTE,
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

  const onChange = (event: React.FormEvent<HTMLInputElement>) => {
    setS3Provider(event.currentTarget.id as S3ProviderType);
  };

  // Only support secure (https) RGW endpoint (no http support)
  // In case both internal and external RGW are present (multi-cluster scenario), select internal only
  // No external RGW support yet (only internal)
  const isInternalRgw = Object.values(systemInfo || []).some(
    (info) =>
      info.isInternalMode && info.isRGWAvailable && info.rgwSecureEndpoint
  );

  return (
    <FormGroup
      label={
        <TextContent className="pf-v5-u-mt-md">
          <Text component={TextVariants.h1}>{t('Storage endpoint')}</Text>
        </TextContent>
      }
      className="pf-v5-u-mx-lg"
    >
      <Flex direction={{ default: 'row' }}>
        <FlexItem>
          <Card
            id="mcg-s3"
            isSelectable
            isSelected={s3Provider === S3ProviderType.Noobaa}
          >
            <CardHeader
              selectableActions={{
                selectableActionId: S3ProviderType.Noobaa,
                selectableActionAriaLabelledby: 'mcg-s3-endpoint-selection',
                name: 'mcg-s3-endpoint-selection',
                variant: 'single',
                onChange,
              }}
            >
              <CardTitle>{t('MultiCloud Object Gateway (MCG)')}</CardTitle>
            </CardHeader>
          </Card>
        </FlexItem>
        <FlexItem>
          <Card
            id="rgw-s3"
            isSelectable
            isSelected={s3Provider === S3ProviderType.RgwInt}
            isDisabled={!isInternalRgw}
          >
            <CardHeader
              selectableActions={{
                selectableActionId: S3ProviderType.RgwInt,
                selectableActionAriaLabelledby: 'rgw-s3-endpoint-selection',
                name: 'rgw-s3-endpoint-selection',
                variant: 'single',
                onChange,
              }}
            >
              <CardTitle>{t('RADOS Object Gateway (RGW)')}</CardTitle>
            </CardHeader>
          </Card>
        </FlexItem>
      </Flex>
    </FormGroup>
  );
};

const BucketsListPage: React.FC = () => {
  const [s3Provider, setS3Provider] = React.useState(S3ProviderType.Noobaa);
  const [activeTab, setActiveTab] = React.useState(0);
  const navigate = useNavigate();

  const { data: systemInfo, isLoading } = useSystemInfo();
  const { t } = useCustomTranslation();

  const handleTabSelect = (
    _event: React.MouseEvent,
    tabIndex: number | string
  ) => {
    const index = Number(tabIndex);
    setActiveTab(index);
    if (index === 0) {
      navigate(BUCKETS_BASE_ROUTE);
    } else if (index === 1) {
      navigate(VECTOR_BUCKETS_BASE_ROUTE);
    }
  };

  return (
    <>
      <StorageEndpoint
        s3Provider={s3Provider}
        setS3Provider={setS3Provider}
        systemInfo={systemInfo}
      />
      {s3Provider === S3ProviderType.Noobaa ? (
        <Tabs activeKey={activeTab} onSelect={handleTabSelect} unmountOnExit>
          <Tab
            eventKey={0}
            title={<TabTitleText>{t('General buckets')}</TabTitleText>}
          >
            <S3Provider loading={isLoading} s3Provider={s3Provider}>
              <BucketsListPageContent />
            </S3Provider>
          </Tab>
          <Tab
            eventKey={1}
            title={<TabTitleText>{t('S3 Vector')}</TabTitleText>}
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
