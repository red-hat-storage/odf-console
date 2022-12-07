import * as React from 'react';
import { getExternalStorage } from '@odf/core/components/utils';
import { StorageClassWizardStepProps as ExternalStorage } from '@odf/shared/custom-extensions/properties/StorageClassWizardStepProps';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Form,
  FormGroup,
  TextContent,
  TextInput,
  TextVariants,
  Text,
} from '@patternfly/react-core';
import { WizardDispatch, WizardState } from '../../reducer';
import './create-storage-class-step.scss';

export const CreateStorageClass: React.FC<CreateStorageClassProps> = ({
  state,
  supportedExternalStorage,
  storageClass,
  externalStorage,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const { component: Component, displayName } = getExternalStorage(
    externalStorage,
    supportedExternalStorage
  ) || {
    Component: null,
    displayName: '',
  };

  const setForm = React.useCallback(
    (field, value) =>
      dispatch({
        type: 'wizard/setCreateStorageClass',
        payload: {
          field,
          value,
        },
      }),
    [dispatch]
  );

  return (
    <Form className="odf-create-storage-class__form">
      <FormGroup label={t('StorageClass name')} fieldId="storage-class-name">
        <TextInput
          id="storage-class-name"
          value={storageClass.name}
          type="text"
          onChange={(value: string) =>
            dispatch({
              type: 'wizard/setStorageClass',
              payload: {
                name: value,
              },
            })
          }
        />
      </FormGroup>
      <TextContent>
        <Text component={TextVariants.h4}>
          {t('{{displayName}} connection details', { displayName })}
        </Text>
      </TextContent>
      {Component && <Component setFormState={setForm} formState={state} />}
    </Form>
  );
};

type CreateStorageClassProps = {
  state: WizardState['createStorageClass'];
  supportedExternalStorage: ExternalStorage[];
  externalStorage: WizardState['backingStorage']['externalStorage'];
  storageClass: WizardState['storageClass'];
  dispatch: WizardDispatch;
};
