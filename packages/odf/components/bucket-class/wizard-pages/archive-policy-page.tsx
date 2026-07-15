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
import { ExternalLink } from '../../mcg-endpoints/gcp-endpoint-type';
import { Action, State } from '../state';

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
        // Clear archive namespace store when unchecked
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
          'Deep archive policy is applicable for standard bucket class. This step is optional. You can create a standard bucket class without enabling archive storage.'
        )}
      </Content>
      {showHelp && (
        <Alert
          isInline
          variant="info"
          title={t('Deep Archive policy')}
          className="nb-create-bc-step-page__info"
          actionClose={
            <AlertActionCloseButton onClose={() => setShowHelp(false)} />
          }
        >
          <p>
            {t(
              'Deep archive tier is used to transition objects to the IBM Deep Archive storage classes for archiving infrequently accessed objects to save storage costs. Opting to Deep archive requires to choose Deep archive Namespace resource in the next step.'
            )}
          </p>
          <ExternalLink
            href="https://github.com/noobaa/noobaa-operator/blob/master/doc/namespace-store-crd.md"
            text={t('Know more')}
          />
        </Alert>
      )}
      <Checkbox
        id="deep-archive-checkbox"
        data-test="deep-archive-checkbox"
        label={t('Standard - IBM Deep archive')}
        isChecked={state.isDeepArchive}
        onChange={handleArchiveChange}
        description={t(
          'Archive data accessed less than once a year with retrieval hours'
        )}
        className="pf-v6-u-mt-md"
      />
      {state.isDeepArchive && (
        <Alert
          isInline
          isPlain
          variant="info"
          title={t('You should create IBM deep archive Namespacestore')}
          className="pf-v6-u-mt-md"
        />
      )}
    </div>
  );
};

export default ArchivePolicyPage;
