import * as React from 'react';
import {
  ExternalCephStateValues,
  ExternalCephStateKeys,
} from '@odf/core/types';
import { StorageClassWizardStepExtensionProps as ExternalStorage } from '@odf/odf-plugin-sdk/extensions';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Content, ContentVariants } from '@patternfly/react-core';
import { getExternalStorage } from '../../utils';
import { WizardDispatch, WizardState } from '../reducer';

export const ConnectionDetails: React.FC<ConnectionDetailsProps> = ({
  state,
  externalStorage,
  dispatch,
  supportedExternalStorage,
}) => {
  const { component: Component } =
    getExternalStorage(externalStorage, supportedExternalStorage) || {};

  const { t } = useCustomTranslation();

  const setForm = React.useCallback(
    (field: ExternalCephStateKeys, value: ExternalCephStateValues) =>
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
      <Content>
        <Content component={ContentVariants.h3}>
          {t('Connection details')}
        </Content>
      </Content>
      {Component && <Component setFormState={setForm} formState={state} />}
    </>
  );
};

type ConnectionDetailsProps = {
  state: WizardState['createStorageClass'];
  externalStorage: WizardState['backingStorage']['externalStorage'];
  dispatch: WizardDispatch;
  supportedExternalStorage: ExternalStorage[];
};
