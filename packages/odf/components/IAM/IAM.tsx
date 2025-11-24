import * as React from 'react';
import { IAMClientConfig } from '@aws-sdk/client-iam';
import { LoadingBox, useCustomTranslation } from '@odf/shared';
import { useNavigate } from 'react-router-dom-v5-compat';
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
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import EditDescriptionTag from './EditDescriptionTag';
import { listUsers, useIAMClientConfig } from './IAMUserFunctions';
import UpdateAccessKey from './UdateAccessKey';

const IAM = () => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const config: IAMClientConfig = useIAMClientConfig(); // Will be replaced with context variable config.
  const [hasNoUsers, setHasNoUsers] = React.useState<boolean>(null);

  React.useMemo(() => {
    (async () => {
      setHasNoUsers((await listUsers(config)).Users.length === 0); //set null to see loading page
    })();
  }, [config, hasNoUsers]);

  if (hasNoUsers === null) {
    return <LoadingBox />;
  }

  return (
    <>
      {!hasNoUsers ? (
        <p>View User</p>
      ) : (
        <>
          <div className="pf-v5-u-pt-xl pf-v5-u-pb-xl pf-v5-u-pl-lg">
            <Title className="pf-v5-u-font-weight-bold" headingLevel="h1">
              {t('Users')}
            </Title>
            <p className="pf-v5-u-pt-md pf-v5-u-disabled-color-100">
              {t(
                'User is an identity who has specific permissions and policies depending on the assigned role'
              )}
            </p>
          </div>
          <EmptyState variant={EmptyStateVariant.lg}>
            <EmptyStateHeader
              titleText="Create user"
              headingLevel="h2"
              icon={<EmptyStateIcon icon={PlusCircleIcon} />}
            />
            <EmptyStateBody>
              {t('Create users to generate and manage accesskeys and policies')}
            </EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button
                  variant="primary"
                  onClick={() => {
                    navigate('/odf/object-storage/iam/createUserForm');
                  }}
                >
                  Create user
                </Button>
              </EmptyStateActions>
              <EmptyStateActions>
                <Button variant="link">{t('Learn more about IAM')}</Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>

          {
            //Update AccessKey and Edit Description tag are temporarily placed here for testing purpouse
            <UpdateAccessKey
              name="name"
              AccessKeyId="ABCDEFGHIJKL"
              config={{
                region: 'none',
                credentials: {
                  accessKeyId: 'AAAAAAA',
                  secretAccessKey: 'SSSSSS',
                },
              }}
              status="Inactive"
            />
          }
          <EditDescriptionTag
            name="name"
            AccessKeyId="ABCDEFGHIJKL"
            config={{
              region: 'none',
              credentials: {
                accessKeyId: 'AAAAAAA',
                secretAccessKey: 'SSSSSS',
              },
            }}
          />
        </>
      )}
    </>
  );
};

export default IAM;
