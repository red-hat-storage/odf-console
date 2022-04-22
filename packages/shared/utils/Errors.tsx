import * as React from 'react';
import * as _ from 'lodash';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import PageHeading from '../heading/page-heading';

export type ErrorComponentProps = {
  title: string;
  message?: string;
};

const ErrorComponent: React.SFC<ErrorComponentProps> = ({ title, message }) => {
  const { t } = useTranslation();
  return (
    <>
      <PageHeading title={t('Error')} />
      <div className="co-m-pane__body" data-test-id="error-page">
        <PageHeading title={title} centerText />
        {message && <div className="pf-u-text-align-center">{message}</div>}
      </div>
    </>
  );
};

type ErrorPageProps = {
  message: string;
};

export const ErrorPage: React.FC<ErrorPageProps> = ({ message }) => {
  const { t } = useTranslation();
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
