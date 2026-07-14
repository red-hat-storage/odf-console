import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Alert,
  AlertActionCloseButton,
  Checkbox,
  Content,
  ContentVariants,
  Title,
} from '@patternfly/react-core';
import { Action, State } from '../state';
import '../create-bc.scss';

type ArchivePolicyPageProps = {
  dispatch: React.Dispatch<Action>;
  state: State;
};

const ArchivePolicyPage: React.FC<ArchivePolicyPageProps> = ({
  dispatch,
  state,
}) => {
  const { t } = useCustomTranslation();
  const [showHelp, setShowHelp] = React.useState(true);

  const handleArchiveChange = React.useCallback(
    (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
      dispatch({ type: 'setIsDeepArchive', value: checked });
      if (!checked) {
        dispatch({ type: 'setArchiveNamespaceStore', value: null });
      }
    },
    [dispatch]
  );

  return (
    <div className="nb-create-bc-step-page">
      <Title
        size="xl"
        headingLevel="h2"
        className="nb-bc-step-page-form__title"
      >
        {t('Archive Policy')}
      </Title>
      <Content component={ContentVariants.p} className="pf-v6-u-mb-lg">
        {t(
          'Deep archive policy is applicable for standard BucketClass. This step is optional. You can create a standard BucketClass without enabling archive storage.'
        )}
      </Content>
      {showHelp && (
        <Alert
          isInline
          variant="info"
          title={t('Deep archive policy')}
          className="nb-create-bc-step-page__info"
          actionClose={
            <AlertActionCloseButton onClose={() => setShowHelp(false)} />
          }
        >
          <p>
            {t(
              'Deep archive tier is used to transition objects to the IBM Deep Archive storage classes for archiving infrequently accessed objects to save storage costs. Opting to Deep archive requires to choose Deep archive NamespaceStore in the next step.'
            )}
          </p>
        </Alert>
      )}
      <Checkbox
        id="deep-archive-checkbox"
        data-test="deep-archive-checkbox"
        label={t('IBM Deep Archive')}
        isChecked={state.isDeepArchive}
        onChange={handleArchiveChange}
        description={t(
          'Archive infrequently accessed data with extended retrieval times'
        )}
        className="pf-v6-u-mt-md"
      />
      {state.isDeepArchive && (
        <Alert
          isInline
          isPlain
          variant="info"
          title={t('You should create IBM Deep Archive NamespaceStore')}
          className="pf-v6-u-mt-md"
        />
      )}
    </div>
  );
};

export default ArchivePolicyPage;
