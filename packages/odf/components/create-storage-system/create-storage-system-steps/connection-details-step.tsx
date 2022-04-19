import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextContent, TextVariants } from '@patternfly/react-core';
import { ExternalStateValues, ExternalStateKeys } from '../../../types';
import { getExternalStorage } from '../../utils';
import { WizardDispatch, WizardState } from '../reducer';

export const ConnectionDetails: React.FC<ConnectionDetailsProps> = ({
  state,
  externalStorage,
  dispatch,
}) => {
  const { Component } = getExternalStorage(externalStorage) || {};
  const { t } = useTranslation('plugin__odf-console');

  const setForm = React.useCallback(
    (field: ExternalStateKeys, value: ExternalStateValues) =>
      dispatch({
        type: 'wizard/setConnectionDetails',
        payload: {
          field,
          value,
        },
      }),
    [dispatch]
  );

  return (
    <>
      <TextContent>
        <Text component={TextVariants.h3}>{t('Connection details')}</Text>
      </TextContent>
      {Component && <Component setFormState={setForm} formState={state} />}
    </>
  );
};

type ConnectionDetailsProps = {
  state: WizardState['createStorageClass'];
  externalStorage: WizardState['backingStorage']['externalStorage'];
  dispatch: WizardDispatch;
};
