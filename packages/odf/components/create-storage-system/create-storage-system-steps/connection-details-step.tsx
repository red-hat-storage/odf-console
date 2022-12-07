import * as React from 'react';
import {
  ExternalCephStateValues,
  ExternalCephStateKeys,
} from '@odf/core/types';
import { StorageClassWizardStepProps as ExternalStorage } from '@odf/shared/custom-extensions/properties/StorageClassWizardStepProps';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Text, TextContent, TextVariants } from '@patternfly/react-core';
import { getExternalStorage } from '../../utils';
import { WizardDispatch, WizardState } from '../reducer';

export const ConnectionDetails: React.FC<ConnectionDetailsProps> = ({
  state,
  externalStorage,
  supportedExternalStorage,
  dispatch,
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
      <TextContent>
        <Text component={TextVariants.h3}>{t('Connection details')}</Text>
      </TextContent>
      {Component && <Component setFormState={setForm} formState={state} />}
    </>
  );
};

type ConnectionDetailsProps = {
  state: WizardState['createStorageClass'];
  supportedExternalStorage: ExternalStorage[];
  externalStorage: WizardState['backingStorage']['externalStorage'];
  dispatch: WizardDispatch;
};
