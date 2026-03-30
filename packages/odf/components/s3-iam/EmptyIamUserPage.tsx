import * as React from 'react';
import { StatusBox, useCustomTranslation } from '@odf/shared';
import { useNavigate } from 'react-router-dom-v5-compat';
import useSWR from 'swr';
import {
  Button,
  Title,
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  EmptyStateActions,
  EmptyStateHeader,
  EmptyStateFooter,
  EmptyStateIcon,
  TextContent,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { USERS_CREATE_PAGE_PATH } from '../../constants/s3-iam';
import { IamContext, IamProvider } from './iam-context';
import UsersListPage from './users-list-page/UsersListPage';

const EmptyIamUserPageContent = () => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const { iamClient } = React.useContext(IamContext);

  const { data, isLoading, error } = useSWR(
    iamClient ? 'iam-users-list' : null,
    () => iamClient.listIamUsers({}),
    {
      shouldRetryOnError: false,
    }
  );

  const users = data?.Users || [];
  const hasNoUsers = users.length === 0;

  if (isLoading || error) {
    return <StatusBox loaded={!isLoading} loadError={isLoading ? '' : error} />;
  }

  if (!hasNoUsers) {
    return <UsersListPage />;
  }

  return (
    <>
      <div className="pf-v5-u-pt-xl pf-v5-u-pb-xl pf-v5-u-pl-lg">
        <TextContent>
          <Title className="pf-v5-u-font-weight-bold" headingLevel="h1">
            {t('Users')}
          </Title>
          <Text component={TextVariants.small} className="pf-v5-u-pt-sm">
            {t(
              'User is an identity who has specific permissions and policies depending on the assigned role'
            )}
          </Text>
        </TextContent>
      </div>
      <EmptyState variant={EmptyStateVariant.lg}>
        <EmptyStateHeader
          titleText={t('Create user')}
          headingLevel="h4"
          icon={<EmptyStateIcon icon={PlusCircleIcon} />}
        />
        <EmptyStateBody>
          {t('Create users to generate and manage access keys and policies')}
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button
              variant="primary"
              onClick={() => navigate(USERS_CREATE_PAGE_PATH)}
            >
              {t('Create user')}
            </Button>
          </EmptyStateActions>
          <EmptyStateActions>
            <Button variant="link">{t('Learn more about IAM')}</Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    </>
  );
};

const EmptyIamUserPage = () => {
  return (
    <IamProvider>
      <EmptyIamUserPageContent />
    </IamProvider>
  );
};

export default EmptyIamUserPage;
