import * as React from 'react';
import { IamUserDetails } from '@odf/core/types';
import PageHeading from '@odf/shared/heading/page-heading';
import { useRefresh } from '@odf/shared/hooks';
import { BlueSyncIcon } from '@odf/shared/status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { useParams } from 'react-router-dom-v5-compat';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { ActionsColumn } from '@patternfly/react-table';
import { DeleteIamUserModal } from '../../../modals/s3-iam/DeleteIamUserModal';
import { CustomActionsToggle } from '../../s3-browser/objects-list';
import { AccessKeysDetails } from '../access-keys-details/AccessKeysDetails';
import { IamContext, IamProvider } from '../iam-context';
import { TagsDetails } from '../tags-details/TagsDetails';

const UserOverview: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [fresh, triggerRefresh] = useRefresh();
  const { userName } = useParams();
  const launcher = useModal();

  const navPages: TabPage[] = React.useMemo(
    () => [
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
    ],
    [t]
  );

  const breadcrumbs = React.useMemo(
    () => [
      {
        name: t('Object Storage'),
        path: '/odf/object-storage',
      },
      {
        name: t('IAM'),
        path: '/odf/object-storage/iam',
      },
      {
        name: t('User'),
        path: '',
      },
    ],
    [t]
  );

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

  const handleDeleteUser = React.useCallback(
    () =>
      launcher(DeleteIamUserModal, {
        isOpen: true,
        extraProps: {
          userName,
          iamClient,
          refreshTokens: triggerRefresh,
        },
      }),
    [launcher, userName, iamClient, triggerRefresh]
  );
  const getUsersActionsItems = React.useMemo(
    () => [
      {
        title: t('Delete user'),
        onClick: handleDeleteUser,
      },
    ],
    [t, handleDeleteUser]
  );

  const renderActions = React.useMemo(
    () => (
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
          items={getUsersActionsItems}
          actionsToggle={CustomActionsToggle}
        />
      </>
    ),
    [t, fresh, triggerRefresh, getUsersActionsItems]
  );

  const customData: IamUserDetails = React.useMemo(
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
        actions={() => renderActions}
        className="pf-v6-u-mt-md"
      />
      <Tabs id="iam-overview" tabs={navPages} customData={customData} />
    </>
  );
};

export default UserOverview;
