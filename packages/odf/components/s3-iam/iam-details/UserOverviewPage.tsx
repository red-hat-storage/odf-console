import * as React from 'react';
import PageHeading from '@odf/shared/heading/page-heading';
import { useRefresh } from '@odf/shared/hooks';
import { S3IAMCommands } from '@odf/shared/iam';
import { BlueSyncIcon } from '@odf/shared/status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'react-i18next';
import { useParams } from 'react-router-dom-v5-compat';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import { CustomActionsToggle } from '../../s3-browser/objects-list';
import { useFetchUserAndAccessKeys } from '../hooks/useFetchUserAndAccessKeys';
import { NoobaaS3IAMContext } from '../iam-context';
import { accessKeysMock, GetUserMock, tagsMock } from '../mock';
import { DeleteIAMUserModal } from '../modals/DeleteIAMUserModal';
import { IAMAccessKeyDetails } from './iam-accesskeys-details/AccessKeyDetails';
import { IAMTagsDetails } from './iam-tags-details/TagsDetails';

const getUsersActionsItems = (
  t: TFunction,
  launcher: LaunchModal,
  userName: string,
  noobaaS3IAM: S3IAMCommands,
  refreshTokens: () => void
): IAction[] => [
  {
    title: t('Delete User'),
    onClick: () =>
      launcher(DeleteIAMUserModal as any, {
        isOpen: true,
        extraProps: {
          userName,
          noobaaS3IAM,
          refreshTokens,
        },
      }),
  },
];

const createUsersActions = (
  t: TFunction,
  fresh: boolean,
  triggerRefresh: () => void,
  launcher: ReturnType<typeof useModal>,
  userName: string,
  noobaaS3IAM: S3IAMCommands
) => {
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

      <ActionsColumn
        items={getUsersActionsItems(
          t,
          launcher,
          userName,
          noobaaS3IAM,
          triggerRefresh
        )}
        actionsToggle={CustomActionsToggle}
      />
    </>
  );
};

/**
 * Fetches the userName from url params and renders the Tags and Accesskey Details Tab
 */
const UserOverview: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [fresh, triggerRefresh] = useRefresh();
  const { resourceName: userName } = useParams();
  const { noobaaS3IAM } = React.useContext(NoobaaS3IAMContext);

  const launcher = useModal();

  // Fetch user details and access keys
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const { userDetails, iamAccessKeys, error, isLoading, refetchAll, tags } =
    useFetchUserAndAccessKeys(userName, noobaaS3IAM);
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const navPages: TabPage[] = [
    {
      href: 'details',
      name: t('Details'),
      component: IAMTagsDetails,
    },
    {
      href: 'accessKeys',
      name: t('Access Keys'),
      component: IAMAccessKeyDetails,
    },
  ];

  const renderActions = () => () =>
    createUsersActions(
      t,
      fresh,
      triggerRefresh,
      launcher,
      userName,
      noobaaS3IAM
    );

  const breadcrumbs = [
    {
      name: t('Object Storage'),
      path: '/odf/object-storage',
    },
    {
      name: t('IAM'),
      path: `/odf/object-storage/s3-iam`,
    },
    {
      name: t('User'),
      path: '',
    },
  ];

  const customData = React.useMemo(
    () => ({
      fresh,
      triggerRefresh,
      userName,
      noobaaS3IAM,
      // userDetails,
      // accessKeys,
      // tags,
      userDetails: GetUserMock.User,
      iamAccessKeys: accessKeysMock.AccessKeyMetadata,
      tags: tagsMock.Tags,
      error,
      isLoading,
      refetchAll,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fresh, triggerRefresh, userName]
  );
  return (
    <>
      <PageHeading
        breadcrumbs={breadcrumbs}
        title={userName}
        actions={renderActions()}
        className="pf-v5-u-mt-md"
      />
      <Tabs id="s3-overview" tabs={navPages} customData={customData} />
    </>
  );
};

export default UserOverview;
