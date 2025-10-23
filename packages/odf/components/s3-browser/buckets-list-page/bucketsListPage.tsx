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
} from '@patternfly/react-core';
import { SyncAltIcon, InfoCircleIcon } from '@patternfly/react-icons';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import { getBucketCreatePageRoute } from '../../../constants';
import { BucketCrFormat } from '../../../types';
import { S3Provider, S3Context } from '../s3-context';
import { LazyS3LoginModal } from '../s3-provider/components/LazyS3Login';
import {
  useSystemInfo,
  SystemInfoData,
} from '../s3-provider/hooks/useSystemInfo';
import { SetSecretRefWithStorage } from '../s3-provider/types';
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

const getAccountActionsItems = (
  t: TFunction,
  launcher: LaunchModal,
  providerType: S3ProviderType,
  logout: () => void,
  setSecretRef: SetSecretRefWithStorage
): IAction[] => [
  {
    title: t('Sign in to another account'),
    description: t('You will be signed out of this account.'),
    onClick: () =>
      launcher(LazyS3LoginModal, {
        isOpen: true,
        extraProps: {
          providerType,
          logout,
          onLogin: setSecretRef,
        },
      }),
  },
  {
    title: t('Sign out'),
    onClick: () => logout(),
  },
];

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
  const { providerType, logout, setSecretRef } = React.useContext(S3Context);
  const launcher = useModal();

  return (
    <>
      <ListPageHeader
        title={t('Buckets')}
        helpText={t('Browse, upload, and manage objects in buckets.')}
        {...(!isAdmin
          ? {
              badge: (
                <Label color="green" icon={<InfoCircleIcon />}>
                  {t('Signed in with credentials')}
                </Label>
              ),
            }
          : {})}
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

  // Only support secure RGW endpoint
  // In case both internal and external RGW are present (multi-cluster scenario), select internal only
  const isInternalRgw = Object.values(systemInfo).some(
    (info) =>
      info.isInternalMode && info.isRGWAvailable && info.rgwSecureEndpoint
  );
  const isExternalRgw = Object.values(systemInfo).some(
    (info) =>
      info.isExternalMode && info.isRGWAvailable && info.rgwSecureEndpoint
  );
  return (
    <Flex direction={{ default: 'row' }} className="pf-v5-u-m-xl">
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
          isSelected={
            s3Provider === S3ProviderType.RgwInt ||
            s3Provider === S3ProviderType.RgwExt
          }
          isDisabled={!isInternalRgw && !isExternalRgw}
        >
          <CardHeader
            selectableActions={{
              selectableActionId: isInternalRgw
                ? S3ProviderType.RgwInt
                : S3ProviderType.RgwExt,
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
  );
};

const BucketsListPage: React.FC = () => {
  const [s3Provider, setS3Provider] = React.useState(S3ProviderType.Noobaa);

  const { data: systemInfo, isLoading } = useSystemInfo();

  return (
    <>
      {!isLoading && (
        <StorageEndpoint
          s3Provider={s3Provider}
          setS3Provider={setS3Provider}
          systemInfo={systemInfo}
        />
      )}
      <S3Provider loading={isLoading} s3Provider={s3Provider}>
        <BucketsListPageContent />
      </S3Provider>
    </>
  );
};

export default BucketsListPage;
