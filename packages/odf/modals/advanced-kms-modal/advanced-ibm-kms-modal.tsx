import * as React from 'react';
import {
  ModalTitle,
  ModalBody,
  ModalSubmitFooter,
} from '@odf/shared/generic/ModalTitle';
import { withHandlePromise } from '@odf/shared/generic/promise-component';
import { createModalLauncher } from '@openshift-console/dynamic-plugin-sdk-internal-kubevirt';
import { useTranslation } from 'react-i18next';
import { FormGroup, TextInput, Form } from '@patternfly/react-core';
import { AdvancedKMSModalProps } from '../../components/kms-config/providers';
import { HpcsConfig, ProviderNames } from '../../types';
import './advanced-kms-modal.scss';

/**
 * This Modal is not used anywhere right now,
 * Not removing it though, might be useful in upcoming release.
 */
export const AdvancedHpcsModal = withHandlePromise(
  (props: AdvancedKMSModalProps) => {
    const { close, cancel, errorMessage, inProgress, state, dispatch } = props;
    const kms: HpcsConfig = state.kms?.[ProviderNames.HPCS];
    const { t } = useTranslation('plugin__odf-console');
    const [baseUrl, setBaseUrl] = React.useState(kms?.baseUrl.value || '');
    const [tokenUrl, setTokenUrl] = React.useState(kms?.tokenUrl || '');

    const submit = (event: React.FormEvent<EventTarget>) => {
      event.preventDefault();

      kms.baseUrl.value = baseUrl;
      const kmsAdvanced = {
        ...kms,
        tokenUrl,
      };
      dispatch({ type: 'securityAndNetwork/setHpcs', payload: kmsAdvanced });
      close();
    };

    return (
      <Form onSubmit={submit} key="advanced-ibm-kms-modal">
        <div className="modal-content modal-content--no-inner-scroll">
          <ModalTitle>
            {t('Key Management Service Advanced Settings')}
          </ModalTitle>
          <ModalBody>
            <FormGroup
              fieldId="kms-base-url"
              label={t('IBM Base URL')}
              className="ceph-advanced-kms__form-body"
            >
              <TextInput
                value={kms.baseUrl.value}
                onChange={setBaseUrl}
                type="text"
                id="kms-base-url"
                name="kms-base-url"
                data-test="kms-base-url"
              />
            </FormGroup>
            <FormGroup
              fieldId="kms-token-url"
              label={t('IBM Token URL')}
              className="ceph-advanced-kms__form-body"
            >
              <TextInput
                value={tokenUrl}
                onChange={setTokenUrl}
                type="text"
                id="kms-token-url"
                name="kms-token-url"
                data-test="kms-token-url"
              />
            </FormGroup>
          </ModalBody>
          <ModalSubmitFooter
            errorMessage={errorMessage}
            inProgress={inProgress}
            submitText={t('Save')}
            cancel={cancel}
          />
        </div>
      </Form>
    );
  }
);

export const advancedHpcsModal = createModalLauncher(AdvancedHpcsModal);
