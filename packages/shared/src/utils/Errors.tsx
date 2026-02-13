import * as React from 'react';
import { Helmet } from 'react-helmet';
import PageHeading from '../heading/page-heading';
import { useCustomTranslation } from '../useCustomTranslationHook';
import '../style.scss';

export type ErrorComponentProps = {
  title: string;
  message?: string;
};

const ErrorComponent: React.SFC<ErrorComponentProps> = ({ title, message }) => {
  const { t } = useCustomTranslation();
  return (
    <>
      <PageHeading title={t('Error')} />
      <div className="odf-m-pane__body" data-test-id="error-page">
        <PageHeading title={title} centerText />
        {message && <div className="pf-v6-u-text-align-center">{message}</div>}
      </div>
    </>
  );
};

type ErrorPageProps = {
  message: string;
};

export const ErrorPage: React.FC<ErrorPageProps> = ({ message }) => {
  const { t } = useCustomTranslation();
  return (
    <div>
      <Helmet>
        <title>{t('Error')}</title>
      </Helmet>
      <ErrorComponent
        title={t('Oh no! Something went wrong.')}
        message={message}
      />
    </div>
  );
};
