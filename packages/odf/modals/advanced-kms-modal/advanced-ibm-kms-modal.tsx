import * as React from 'react';
import { ModalBody, ModalFooter, ModalHeader } from '@odf/shared/modals/Modal';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  FormGroup,
  TextInput,
  Modal,
  ModalVariant,
  Button,
} from '@patternfly/react-core';
import { AdvancedKMSModalProps } from '../../components/kms-config/providers';
import { HpcsConfig, ProviderNames } from '../../types';
import './advanced-kms-modal.scss';

/**
 * This Modal is not used anywhere right now,
 * Not removing it though, might be useful in upcoming release.
 */
const AdvancedHpcsModal = (props: AdvancedKMSModalProps) => {
  const {
    closeModal,
    isOpen,
    extraProps: { state, dispatch },
  } = props;

  const kms: HpcsConfig = state.kms?.[ProviderNames.HPCS];
  const { t } = useCustomTranslation();
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
    closeModal();
  };

  const Header = (
    <ModalHeader>{t('Key Management Service Advanced Settings')}</ModalHeader>
  );
  return (
    <Modal
      header={Header}
      isOpen={isOpen}
      onClose={closeModal}
      showClose={false}
      hasNoBodyWrapper={true}
      variant={ModalVariant.small}
      className="modal-content modal-content--no-inner-scroll"
    >
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
      <ModalFooter>
        <Button key="cancel" variant="secondary" onClick={closeModal}>
          {t('Cancel')}
        </Button>
        <Button key="Save" variant="primary" onClick={submit}>
          {t('Save')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AdvancedHpcsModal;
