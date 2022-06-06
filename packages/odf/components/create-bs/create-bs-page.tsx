import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps, useHistory } from 'react-router';
import { Alert, AlertActionCloseButton, Title } from '@patternfly/react-core';
import CreateBackingStoreForm from './create-bs';
import '../mcg-endpoints/noobaa-provider-endpoints.scss';
import '../../style.scss';

const CreateBackingStoreFormPage: React.FC<CreateBackingStoreFormPageProps> = ({
  match,
}) => {
  const { t } = useTranslation();
  const [showHelp, setShowHelp] = React.useState(true);
  const { ns, appName } = match.params;

  const history = useHistory();

  const onCancel = () => {
    history.goBack();
  };

  return (
    <>
      <div className="odf-create-operand__header">
        <Title
          size="2xl"
          headingLevel="h1"
          className="odf-create-operand__header-text"
        >
          {t('Create new BackingStore ')}
        </Title>
        <p className="help-block">
          {t(
            'Storage targets that are used to store chunks of data on Multicloud Object Gateway buckets.'
          )}
        </p>
      </div>
      <div className="nb-endpoints-page">
        {showHelp && (
          <Alert
            isInline
            variant="info"
            title={t('What is a BackingStore?')}
            actionClose={
              <AlertActionCloseButton onClose={() => setShowHelp(false)} />
            }
          >
            {t(
              'A BackingStore represents a storage target to be used as the underlying storage layer in Multicloud Object Gateway buckets.'
            )}
            <br />
            {t(
              'Multiple types of BackingStores are supported: AWS S3 S3 Compatible Google Cloud Storage Azure Blob PVC.'
            )}
          </Alert>
        )}
        <CreateBackingStoreForm
          onCancel={onCancel}
          isPage
          namespace={ns}
          className="nb-endpoints-page-form__short"
          appName={appName}
        />
      </div>
    </>
  );
};

type CreateBackingStoreFormPageProps = RouteComponentProps<{
  ns?: string;
  appName?: string;
}>;

export default CreateBackingStoreFormPage;
