import * as React from 'react';
import { BucketDetails } from '@odf/core/components/s3-browser/bucket-details/BucketDetails';
import { ODF_ADMIN } from '@odf/core/features';
import {
  EmptyBucketAlerts,
  EmptyBucketResponse,
} from '@odf/core/modals/s3-browser/delete-and-empty-bucket/EmptyBucketModal';
import {
  LazyEmptyBucketModal,
  LazyDeleteBucketModal,
} from '@odf/core/modals/s3-browser/delete-and-empty-bucket/lazy-delete-and-empty-bucket';
import { S3ProviderType } from '@odf/core/types';
import PageHeading from '@odf/shared/heading/page-heading';
import { useRefresh } from '@odf/shared/hooks';
import { ModalKeys, defaultModalMap } from '@odf/shared/modals/types';
import { NooBaaObjectBucketModel } from '@odf/shared/models';
import { S3Commands } from '@odf/shared/s3';
import { BlueSyncIcon } from '@odf/shared/status';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import Tabs, { TabPage, YAMLEditorWrapped } from '@odf/shared/utils/Tabs';
import {
  useModal,
  K8sResourceCommon,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import { useNavigate, NavigateFunction } from 'react-router-dom-v5-compat';
import { useParams, useSearchParams } from 'react-router-dom-v5-compat';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import {
  PREFIX,
  getBucketOverviewBaseRoute,
  PERMISSIONS_ROUTE,
  MANAGEMENT_ROUTE,
} from '../../../constants';
import { getBreadcrumbs } from '../../../utils';
import { useProviderType } from '../../s3-common/hooks/useProviderType';
import { CustomActionsToggle } from '../objects-list';
import { ObjectListWithSidebar } from '../objects-list/ObjectListWithSidebar';
import { S3Provider, S3Context } from '../s3-context';
import { PageTitle } from './PageTitle';
import { useBucketOrigin } from './useBucketOrigin';
import './bucket-overview.scss';

type CustomYAMLEditorProps = {
  obj: {
    resource: K8sResourceCommon;
  };
};

const CustomYAMLEditor: React.FC<CustomYAMLEditorProps> = ({
  obj: { resource },
}) => (
  <div className="obc-bucket-yaml">
    <YAMLEditorWrapped obj={resource} />
  </div>
);

const getBucketActionsItems = (
  t: TFunction,
  launcher: LaunchModal,
  navigate: NavigateFunction,
  bucketName: string,
  allowResourceEditing: boolean,
  s3Client: S3Commands,
  noobaaObjectBucket: K8sResourceKind,
  refreshTokens: () => void,
  setEmptyBucketResponse: React.Dispatch<
    React.SetStateAction<EmptyBucketResponse>
  >
): IAction[] => {
  const providerType = s3Client.providerType as S3ProviderType;
  return [
    {
      title: t('Empty bucket'),
      onClick: () =>
        launcher(LazyEmptyBucketModal, {
          isOpen: true,
          extraProps: {
            bucketName,
            s3Client,
            refreshTokens,
            setEmptyBucketResponse,
          },
        }),
    },
    {
      title: t('Delete bucket'),
      onClick: () =>
        launcher(LazyDeleteBucketModal, {
          isOpen: true,
          extraProps: {
            bucketName,
            s3Client,
            launcher,
            refreshTokens,
            setEmptyBucketResponse,
          },
        }),
    },
    ...(allowResourceEditing
      ? [
          {
            title: t('Edit labels'),
            onClick: () =>
              launcher(defaultModalMap[ModalKeys.EDIT_LABELS], {
                extraProps: {
                  resource: noobaaObjectBucket,
                  resourceModel: NooBaaObjectBucketModel,
                },
                isOpen: true,
              }),
          },
          {
            title: t('Edit annotations'),
            onClick: () =>
              launcher(defaultModalMap[ModalKeys.EDIT_ANN], {
                extraProps: {
                  resource: noobaaObjectBucket,
                  resourceModel: NooBaaObjectBucketModel,
                },
                isOpen: true,
              }),
          },
          {
            title: t('Edit bucket'),
            onClick: () =>
              navigate(
                `${getBucketOverviewBaseRoute(bucketName, providerType)}/yaml`
              ),
          },
        ]
      : []),
  ];
};

const createBucketActions = (
  t: TFunction,
  fresh: boolean,
  triggerRefresh: () => void,
  foldersPath: string | null,
  launcher: ReturnType<typeof useModal>,
  navigate: NavigateFunction,
  bucketName: string,
  allowResourceEditing: boolean,
  s3Client: S3Commands,
  noobaaObjectBucket: K8sResourceKind,
  setEmptyBucketResponse: React.Dispatch<
    React.SetStateAction<EmptyBucketResponse>
  >
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
      {!foldersPath && (
        <ActionsColumn
          items={getBucketActionsItems(
            t,
            launcher,
            navigate,
            bucketName,
            allowResourceEditing,
            s3Client,
            noobaaObjectBucket,
            triggerRefresh,
            setEmptyBucketResponse
          )}
          actionsToggle={CustomActionsToggle}
        />
      )}
    </>
  );
};

const BucketOverview: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [fresh, triggerRefresh] = useRefresh();

  const launcher = useModal();
  const navigate = useNavigate();

  const { bucketName } = useParams();
  const [searchParams] = useSearchParams();

  const isAdmin = useFlag(ODF_ADMIN);
  const providerType = useProviderType();

  const [emptyBucketResponse, setEmptyBucketResponse] =
    React.useState<EmptyBucketResponse>({
      response: null,
      bucketName: '',
    });

  // if non-empty means we are inside particular folder(s) of a bucket, else just inside a bucket (top-level)
  const foldersPath = searchParams.get(PREFIX);

  // "isCreatedByOBC" denotes whether bucket is created via OBC or S3 endpoint (will be false if we are inside folder view)
  const { isCreatedByOBC, noobaaObjectBucket, isLoading, error } =
    useBucketOrigin(bucketName, foldersPath, isAdmin);

  const allowResourceEditing = isAdmin && isCreatedByOBC && _.isEmpty(error);

  const { breadcrumbs, currentFolder } = React.useMemo(
    () => getBreadcrumbs(foldersPath, bucketName, providerType, t),
    [foldersPath, bucketName, providerType, t]
  );

  const navPages: TabPage[] = React.useMemo(
    () => [
      {
        href: 'objects',
        title: t('Objects'),
        component: ObjectListWithSidebar,
      },
      ...(!foldersPath
        ? [
            {
              href: 'properties',
              title: t('Properties'),
              component: BucketDetails,
            },
            {
              href: PERMISSIONS_ROUTE,
              title: t('Permissions'),
              component: React.lazy(() => import('./PermissionsNav')),
            },
            {
              href: MANAGEMENT_ROUTE,
              title: t('Management'),
              component: React.lazy(() => import('./ManagementNav')),
            },
          ]
        : []),
      ...(allowResourceEditing
        ? [
            {
              href: 'yaml',
              title: t('YAML'),
              component: CustomYAMLEditor,
            },
          ]
        : []),
    ],
    [foldersPath, allowResourceEditing, t]
  );

  const renderActions = (s3Client: S3Commands) => () =>
    createBucketActions(
      t,
      fresh,
      triggerRefresh,
      foldersPath,
      launcher,
      navigate,
      bucketName,
      allowResourceEditing,
      s3Client,
      noobaaObjectBucket,
      setEmptyBucketResponse
    );

  return (
    <S3Provider loading={isLoading}>
      <BucketOverviewContent
        breadcrumbs={breadcrumbs}
        foldersPath={foldersPath}
        currentFolder={currentFolder}
        isCreatedByOBC={isCreatedByOBC}
        noobaaObjectBucket={noobaaObjectBucket}
        fresh={fresh}
        triggerRefresh={triggerRefresh}
        navPages={navPages}
        bucketName={bucketName}
        actions={renderActions}
        launcher={launcher}
        emptyBucketResponse={emptyBucketResponse}
        setEmptyBucketResponse={setEmptyBucketResponse}
      />
    </S3Provider>
  );
};

type BucketOverviewContentProps = {
  breadcrumbs: { name: string; path: string }[];
  foldersPath: string | null;
  currentFolder: string;
  isCreatedByOBC: boolean;
  fresh: boolean;
  triggerRefresh: () => void;
  noobaaObjectBucket: K8sResourceKind;
  navPages: TabPage[];
  bucketName: string;
  actions: (s3Client: S3Commands) => () => JSX.Element;
  launcher: LaunchModal;
  emptyBucketResponse: EmptyBucketResponse;
  setEmptyBucketResponse: React.Dispatch<
    React.SetStateAction<EmptyBucketResponse>
  >;
};

const BucketOverviewContent: React.FC<BucketOverviewContentProps> = ({
  breadcrumbs,
  foldersPath,
  currentFolder,
  isCreatedByOBC,
  fresh,
  triggerRefresh,
  noobaaObjectBucket,
  navPages,
  bucketName,
  actions,
  emptyBucketResponse,
  setEmptyBucketResponse,
}) => {
  const { s3Client } = React.useContext(S3Context);

  const customData = React.useMemo(
    () => ({
      fresh,
      triggerRefresh,
      resource: noobaaObjectBucket,
    }),
    [fresh, triggerRefresh, noobaaObjectBucket]
  );

  const providerType = s3Client.providerType as S3ProviderType;

  return (
    <>
      <PageHeading
        breadcrumbs={breadcrumbs}
        title={
          <PageTitle
            bucketName={bucketName}
            providerType={providerType}
            foldersPath={foldersPath}
            currentFolder={currentFolder}
            isCreatedByOBC={isCreatedByOBC}
            noobaaObjectBucket={noobaaObjectBucket}
          />
        }
        actions={actions(s3Client)}
        className="pf-v6-u-mt-md"
      />
      <EmptyBucketAlerts
        emptyBucketResponse={emptyBucketResponse}
        setEmptyBucketResponse={setEmptyBucketResponse}
        triggerRefresh={triggerRefresh}
      />
      <Tabs id="s3-overview" tabs={navPages} customData={customData} />
    </>
  );
};

export default BucketOverview;
