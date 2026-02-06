import * as React from 'react';
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
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'react-i18next';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Label,
  Card,
  CardHeader,
  CardTitle,
  FormGroup,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { SyncAltIcon, InfoCircleIcon } from '@patternfly/react-icons';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import { getBucketCreatePageRoute } from '../../../constants';
import { BucketCrFormat } from '../../../types';
import { LazyLoginModal } from '../../s3-common/components/LazyLogin';
import {
  useSystemInfo,
  SystemInfoData,
} from '../../s3-common/hooks/useSystemInfo';
import { SetSecretRefWithStorage, ClientType } from '../../s3-common/types';
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

export const getAccountActionsItems = (
  t: TFunction,
  launcher: LaunchModal,
  providerType: S3ProviderType,
  logout: () => void,
  setSecretRef: SetSecretRefWithStorage,
  clientType?: ClientType
): IAction[] => [
  {
    title: t('Sign in to another account'),
    description: t('You will be signed out of this account.'),
    onClick: () =>
      launcher(LazyLoginModal, {
        isOpen: true,
        extraProps: {
          providerType,
          logout,
          onLogin: setSecretRef,
          type: clientType,
        },
      }),
  },
  {
    title: t('Sign out'),
    onClick: () => logout(),
  },
];

export const getAcountBadge = (t: TFunction) => (
  <Label color="green" icon={<InfoCircleIcon />}>
    {t('Signed in with credentials')}
  </Label>
);

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
        <Content className="pf-v6-u-mt-md">
          <Content component={ContentVariants.h1}>
            {t('Storage endpoint')}
          </Content>
        </Content>
      }
      className="pf-v6-u-mx-lg"
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

  const { data: systemInfo, isLoading } = useSystemInfo();

  return (
    <>
      <StorageEndpoint
        s3Provider={s3Provider}
        setS3Provider={setS3Provider}
        systemInfo={systemInfo}
      />
      <S3Provider loading={isLoading} s3Provider={s3Provider}>
        <BucketsListPageContent />
      </S3Provider>
    </>
  );
};

export default BucketsListPage;
