import * as React from 'react';
import { IAMUserDetails } from '@odf/core/types';
import PageHeading from '@odf/shared/heading/page-heading';
import { useRefresh } from '@odf/shared/hooks';
import { IamCommands } from '@odf/shared/iam';
import { BlueSyncIcon } from '@odf/shared/status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'react-i18next';
import { useParams } from 'react-router-dom-v5-compat';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import { DeleteIamUserModal } from '../../../modals/s3-iam/DeleteIamUserModal';
import { CustomActionsToggle } from '../../s3-browser/objects-list';
import { AccessKeysDetails } from '../accesskeys-details/AccessKeysDetails';
import { IamContext, IamProvider } from '../iam-context';
import { TagsDetails } from '../tags-details/TagsDetails';

const getUsersActionsItems = (
  t: TFunction,
  launcher: LaunchModal,
  userName: string,
  iamClient: IamCommands,
  refreshTokens: () => void
): IAction[] => [
  {
    title: t('Delete user'),
    onClick: () =>
      launcher(DeleteIamUserModal as any, {
        isOpen: true,
        extraProps: {
          userName,
          iamClient,
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
  iamClient: IamCommands
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
          iamClient,
          triggerRefresh
        )}
        actionsToggle={CustomActionsToggle}
      />
    </>
  );
};

const UserOverview: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [fresh, triggerRefresh] = useRefresh();
  const { userName } = useParams();
  const launcher = useModal();

  const navPages: TabPage[] = [
    {
      href: 'details',
      name: t('Details'),
      component: TagsDetails,
    },
    {
      href: 'access-keys',
      name: t('Access Keys'),
      component: AccessKeysDetails,
    },
  ];

  const breadcrumbs = [
    {
      name: t('Object Storage'),
      path: '/odf/object-storage',
    },
    {
      name: t('IAM'),
      path: `/odf/object-storage/iam`,
    },
    {
      name: t('User'),
      path: '',
    },
  ];

  return (
    <IamProvider>
      <UserOverviewContent
        breadcrumbs={breadcrumbs}
        fresh={fresh}
        triggerRefresh={triggerRefresh}
        navPages={navPages}
        userName={userName}
        launcher={launcher}
      />
    </IamProvider>
  );
};

type UserOverviewContentProps = {
  breadcrumbs: { name: string; path: string }[];
  fresh: boolean;
  triggerRefresh: () => void;
  navPages: TabPage[];
  userName: string;
  launcher: LaunchModal;
};

const UserOverviewContent: React.FC<UserOverviewContentProps> = ({
  breadcrumbs,
  fresh,
  triggerRefresh,
  navPages,
  userName,
  launcher,
}) => {
  const { t } = useCustomTranslation();
  const { iamClient } = React.useContext(IamContext);

  const renderActions = () =>
    createUsersActions(t, fresh, triggerRefresh, launcher, userName, iamClient);

  const customData: IAMUserDetails = React.useMemo(
    () => ({
      fresh,
      triggerRefresh,
      userName,
      iamClient,
    }),
    [fresh, triggerRefresh, userName, iamClient]
  );

  return (
    <>
      <PageHeading
        breadcrumbs={breadcrumbs}
        title={userName}
        actions={renderActions}
        className="pf-v5-u-mt-md"
      />
      <Tabs id="iam-overview" tabs={navPages} customData={customData} />
    </>
  );
};

export default UserOverview;
