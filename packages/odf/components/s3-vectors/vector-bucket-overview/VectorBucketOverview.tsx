import * as React from 'react';
import { BucketType } from '@odf/core/constants';
import {
  getVectorBucketOverviewBaseRoute,
  VECTOR_BUCKETS_BASE_ROUTE,
} from '@odf/core/constants/s3-vectors';
import { LazyDeleteVectorBucketModal } from '@odf/core/modals/s3-vectors/delete-vector-bucket/lazy-delete-vector-bucket';
import { S3ProviderType } from '@odf/core/types';
import { BlueSyncIcon, PageHeading } from '@odf/shared';
import { useRefresh } from '@odf/shared/hooks';
import { S3VectorsCommands } from '@odf/shared/s3-vectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import {
  K8sResourceKind,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'react-i18next';
import { useParams } from 'react-router-dom-v5-compat';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import { PageTitle } from '../../s3-browser/bucket-overview/PageTitle';
import { useBucketOrigin } from '../../s3-browser/bucket-overview/useBucketOrigin';
import { CustomActionsToggle } from '../../s3-browser/objects-list';
import { S3VectorsContext, S3VectorsProvider } from '../s3-vectors-context';
import VectorIndexesListPage from '../vector-indexes-list-page/VectorIndexesListPage';

const getVectorBucketActionsItems = (
  t: TFunction,
  launcher: LaunchModal,
  vectorBucketName: string,
  s3VectorsClient: S3VectorsCommands,
  refreshTokens: () => void
): IAction[] => {
  return [
    {
      title: t('Delete bucket'),
      onClick: () =>
        launcher(LazyDeleteVectorBucketModal, {
          isOpen: true,
          extraProps: {
            vectorBucketName,
            s3VectorsClient,
            launcher,
            refreshTokens,
          },
        }),
    },
  ];
};
const createVectorBucketActions = (
  t: TFunction,
  fresh: boolean,
  triggerRefresh: () => void,
  launcher: ReturnType<typeof useModal>,
  vectorBucketName: string,
  s3VectorsClient: S3VectorsCommands
) => {
  return (
    <>
      <Button
        className="pf-v6-u-mr-md pf-v6-u-mb-xs"
        variant={ButtonVariant.link}
        icon={<BlueSyncIcon />}
        onClick={triggerRefresh}
        isDisabled={!fresh}
        isInline
      >
        {t('Refresh')}
      </Button>
      <ActionsColumn
        items={getVectorBucketActionsItems(
          t,
          launcher,
          vectorBucketName,
          s3VectorsClient,
          triggerRefresh
        )}
        actionsToggle={CustomActionsToggle}
      />
    </>
  );
};

const VectorBucketOverview: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [fresh, triggerRefresh] = useRefresh();

  const launcher = useModal();

  const { vectorBucketName, providerType } = useParams();

  // "isCreatedByOBC" denotes whether bucket is created via OBC or S3 endpoint
  const { isCreatedByOBC, noobaaObjectBucket, isLoading } = useBucketOrigin(
    vectorBucketName,
    null
  );
  const breadcrumbs = React.useMemo(
    () => [
      {
        name: t('Buckets'),
        path: VECTOR_BUCKETS_BASE_ROUTE,
      },
      {
        name: vectorBucketName,
        path: `${getVectorBucketOverviewBaseRoute(vectorBucketName as string, providerType as S3ProviderType)}`,
      },
    ],
    [providerType, t, vectorBucketName]
  );

  const navPages: TabPage[] = React.useMemo(
    () => [
      {
        href: 'vector-indexes',
        title: t('Vector indexes'),
        component: VectorIndexesListPage,
      },
      {
        href: 'permissions',
        title: t('Permissions'),
        component: React.lazy(() => import('./PermissionsNav')),
      },
    ],
    [t]
  );

  const renderActions = (s3VectorsClient: S3VectorsCommands) => () =>
    createVectorBucketActions(
      t,
      fresh,
      triggerRefresh,
      launcher,
      vectorBucketName,
      s3VectorsClient
    );

  return (
    <S3VectorsProvider loading={isLoading}>
      <VectorBucketOverviewContent
        breadcrumbs={breadcrumbs}
        isCreatedByOBC={isCreatedByOBC}
        noobaaObjectBucket={noobaaObjectBucket}
        fresh={fresh}
        triggerRefresh={triggerRefresh}
        navPages={navPages}
        vectorBucketName={vectorBucketName}
        providerType={providerType as S3ProviderType}
        actions={renderActions}
      />
    </S3VectorsProvider>
  );
};

type BucketOverviewContentProps = {
  breadcrumbs: { name: string; path: string }[];
  isCreatedByOBC: boolean;
  fresh: boolean;
  triggerRefresh: () => void;
  noobaaObjectBucket: K8sResourceKind;
  navPages: TabPage[];
  vectorBucketName: string;
  providerType: S3ProviderType;
  actions: (s3VectorsClient: S3VectorsCommands) => () => JSX.Element;
};

const VectorBucketOverviewContent: React.FC<BucketOverviewContentProps> = ({
  breadcrumbs,
  isCreatedByOBC,
  fresh,
  triggerRefresh,
  noobaaObjectBucket,
  navPages,
  vectorBucketName,
  providerType,
  actions,
}) => {
  const { s3VectorsClient } = React.useContext(S3VectorsContext);

  const customData = React.useMemo(
    () => ({
      fresh,
      triggerRefresh,
      vectorBucketName,
      s3VectorsClient,
    }),
    [fresh, triggerRefresh, vectorBucketName, s3VectorsClient]
  );

  return (
    <>
      <PageHeading
        breadcrumbs={breadcrumbs}
        title={
          <PageTitle
            bucketName={vectorBucketName}
            providerType={providerType}
            foldersPath=""
            currentFolder=""
            isCreatedByOBC={isCreatedByOBC}
            noobaaObjectBucket={noobaaObjectBucket}
            bucketType={BucketType.S3Vector}
          />
        }
        actions={actions(s3VectorsClient)}
        className="pf-v6-u-mt-md"
      />
      <Tabs
        id="s3-vectors-overview"
        tabs={navPages}
        basePath={getVectorBucketOverviewBaseRoute(
          vectorBucketName,
          providerType
        )}
        customData={customData}
      />
    </>
  );
};
export default VectorBucketOverview;
