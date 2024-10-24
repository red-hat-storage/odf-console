import * as React from 'react';
import { BucketDetails } from '@odf/core/components/s3-browser/bucket-details/BucketDetails';
import {
  LazyEmptyBucketModal,
  LazyDeleteBucketModal,
} from '@odf/core/modals/s3-browser/delete-buckets/LazyDeleteBucket';
import PageHeading from '@odf/shared/heading/page-heading';
import { useRefresh } from '@odf/shared/hooks';
import { ModalKeys, defaultModalMap } from '@odf/shared/modals/types';
import { S3Commands } from '@odf/shared/s3';
import { BlueSyncIcon } from '@odf/shared/status';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  referenceForModel,
  getValidWatchK8sResourceObj,
} from '@odf/shared/utils';
import { YAMLEditorWrapped } from '@odf/shared/utils/Tabs';
import {
  useK8sWatchResource,
  HorizontalNav,
  useModal,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'i18next';
import { useNavigate, NavigateFunction } from 'react-router-dom-v5-compat';
import { useParams, useSearchParams } from 'react-router-dom-v5-compat';
import {
  Alert,
  AlertActionCloseButton,
  Button,
  ButtonVariant,
} from '@patternfly/react-core';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import { PREFIX, BUCKETS_BASE_ROUTE } from '../../../constants';
import { NooBaaObjectBucketModel } from '../../../models';
import { getBreadcrumbs } from '../../../utils';
import { NoobaaS3Context, NoobaaS3Provider } from '../noobaa-context';
import { CustomActionsToggle } from '../objects-list';
import { ObjectListWithSidebar } from '../objects-list/ObjectListWithSidebar';
import { PageTitle } from './PageTitle';

type CustomYAMLEditorProps = {
  obj: {
    resource: K8sResourceCommon;
  };
};

const CustomYAMLEditor: React.FC<CustomYAMLEditorProps> = ({
  obj: { resource },
}) => <YAMLEditorWrapped obj={resource} />;

const getBucketActionsItems = (
  t: TFunction,
  launcher: LaunchModal,
  navigate: NavigateFunction,
  bucketName: string,
  isCreatedByOBC: boolean,
  noobaaS3: S3Commands,
  noobaaObjectBucket: K8sResourceKind,
  refreshTokens: () => void,
  handleEmptyBucketResult: (success: boolean, errorMessage?: string) => void
): IAction[] => [
  {
    title: t('Empty bucket'),
    onClick: () =>
      launcher(LazyEmptyBucketModal, {
        isOpen: true,
        extraProps: {
          bucketName,
          noobaaS3,
          handleEmptyBucketResult,
          refreshTokens,
        },
      }),
  },
  {
    title: t('Delete bucket'),
    onClick: () =>
      launcher(LazyDeleteBucketModal, {
        isOpen: true,
        extraProps: { bucketName, noobaaS3, launcher, refreshTokens },
      }),
  },
  ...(isCreatedByOBC
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
          onClick: () => navigate(`${BUCKETS_BASE_ROUTE}/${bucketName}/yaml`),
        },
      ]
    : []),
];

const BucketOverview: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [fresh, triggerRefresh] = useRefresh();

  const launcher = useModal();
  const navigate = useNavigate();

  const { bucketName } = useParams();
  const [searchParams] = useSearchParams();
  // if non-empty means we are inside particular folder(s) of a bucket, else just inside a bucket (top-level)
  const foldersPath = searchParams.get(PREFIX);

  const [objectBuckets, objectBucketsLoaded, objectBucketsError] =
    useK8sWatchResource<K8sResourceKind[]>(
      getValidWatchK8sResourceObj(
        {
          kind: referenceForModel(NooBaaObjectBucketModel),
          namespaced: false,
          isList: true,
        },
        !foldersPath
      )
    );
  const noobaaObjectBucket: K8sResourceKind = objectBuckets?.find(
    (ob) => ob.spec?.endpoint?.bucketName === bucketName
  );
  // denotes whether bucket is created via OBC or S3 endpoint (will be false if we are inside folder view)
  const isCreatedByOBC = !!noobaaObjectBucket;

  const { breadcrumbs, currentFolder } = React.useMemo(
    () => getBreadcrumbs(foldersPath, bucketName, t),
    [foldersPath, bucketName, t]
  );

  const navPages = [
    {
      href: '',
      name: t('Objects'),
      component: ObjectListWithSidebar,
    },
    ...(!foldersPath
      ? [
          {
            href: 'details',
            name: t('Details'),
            component: BucketDetails,
          },
        ]
      : []),
    ...(isCreatedByOBC
      ? [
          {
            href: 'yaml',
            name: t('YAML'),
            component: CustomYAMLEditor,
          },
        ]
      : []),
  ];

  const actions = (noobaaS3, handleEmptyBucketResult) => () => {
    return (
      <>
        <Button
          className="pf-v5-u-mr-md pf-v5-u-mb-xs"
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
            translate={null}
            items={getBucketActionsItems(
              t,
              launcher,
              navigate,
              bucketName,
              isCreatedByOBC,
              noobaaS3,
              noobaaObjectBucket,
              triggerRefresh,
              handleEmptyBucketResult
            )}
            actionsToggle={CustomActionsToggle}
          />
        )}
      </>
    );
  };

  return (
    <NoobaaS3Provider loading={!objectBucketsLoaded} error={objectBucketsError}>
      <PageHeadingWithNoobaa
        breadcrumbs={breadcrumbs}
        foldersPath={foldersPath}
        currentFolder={currentFolder}
        isCreatedByOBC={isCreatedByOBC}
        noobaaObjectBucket={noobaaObjectBucket}
        fresh={fresh}
        triggerRefresh={triggerRefresh}
        navPages={navPages}
        bucketName={bucketName}
        actions={actions}
      />
    </NoobaaS3Provider>
  );
};

type NavPage = {
  href: string;
  name: string;
  component: React.ComponentType<any>;
};

type PageHeadingWithNoobaaProps = {
  breadcrumbs: Array<{ name: string; path: string }>;
  foldersPath: string | null;
  currentFolder: string;
  isCreatedByOBC: boolean;
  fresh: boolean;
  triggerRefresh: () => void;
  noobaaObjectBucket: K8sResourceKind;
  navPages: NavPage[];
  bucketName: string;
  actions: (
    noobaaS3: S3Commands,
    handleEmptyBucketResult: (success: boolean, errorMessage?: string) => void
  ) => () => JSX.Element;
};

const PageHeadingWithNoobaa: React.FC<PageHeadingWithNoobaaProps> = ({
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
}) => {
  const { t } = useCustomTranslation();
  const [alert, setAlert] = React.useState<{
    type: 'success' | 'error' | null;
    message?: string;
  }>({ type: null });

  const { noobaaS3 } = React.useContext(NoobaaS3Context);

  const handleEmptyBucketResult = (success: boolean, errorMessage?: string) => {
    if (success) {
      setAlert({
        type: 'success',
        message: t('Successfully emptied bucket {{bucketName}}', {
          bucketName,
        }),
      });
    } else {
      setAlert({
        type: 'error',
        message: errorMessage || t('Cannot empty bucket'),
      });
    }
    // Auto-hide the alert after 5 seconds
    setTimeout(() => setAlert({ type: null }), 5000);
  };

  return (
    <>
      <PageHeading
        breadcrumbs={breadcrumbs}
        title={
          <PageTitle
            bucketName={bucketName}
            foldersPath={foldersPath}
            currentFolder={currentFolder}
            isCreatedByOBC={isCreatedByOBC}
            noobaaObjectBucket={noobaaObjectBucket}
          />
        }
        actions={actions(noobaaS3, handleEmptyBucketResult)}
        className="pf-v5-u-mt-md"
      />
      {alert.type === 'success' && (
        <Alert
          variant="success"
          title={alert.message}
          isInline
          className="co-alert pf-v5-u-mb-md"
          actionClose={
            <AlertActionCloseButton onClose={() => setAlert({ type: null })} />
          }
        >
          <p>
            {t(
              'Your bucket is now empty. If you want to delete this bucket, use the delete bucket configuration'
            )}
          </p>
        </Alert>
      )}

      {alert.type === 'error' && (
        <Alert
          variant="danger"
          title={t('Empty bucket - Failed')}
          isInline
          className="co-alert pf-v5-u-mb-md"
          actionClose={
            <AlertActionCloseButton onClose={() => setAlert({ type: null })} />
          }
        >
          <p>{t('Failure reason may include:')}</p>
          <ul>
            <li>{t('Permission Issue/Conflicts')}</li>
            <li>
              {t(
                'Bucket policy could be used by an user (done via S3 API), a potential reason for this failure and should be taken into account in MVP.'
              )}
            </li>
          </ul>
          <p>
            {t(
              'Object locking is not in NooBaa, so it should not be considered for MVP.'
            )}
          </p>
          <Button
            variant="link"
            isInline
            onClick={() => {
              /* Add your check potential reasons handler */
            }}
          >
            {t('Check potential reasons')}
          </Button>
        </Alert>
      )}

      <HorizontalNav
        pages={navPages}
        resource={
          {
            refresh: fresh,
            triggerRefresh,
            resource: noobaaObjectBucket,
          } as any
        }
      />
    </>
  );
};

export default BucketOverview;
