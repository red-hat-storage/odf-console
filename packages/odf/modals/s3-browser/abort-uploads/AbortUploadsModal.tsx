import * as React from 'react';
import { ButtonBar, useCustomTranslation } from '@odf/shared';
import { Trans } from 'react-i18next';
import {
  Button,
  ButtonVariant,
  Modal,
  ModalVariant,
} from '@patternfly/react-core';

type AbortUploadsModalProps = {
  abortAll: () => Promise<void>;
};

export const AbortUploadsModal: React.FC<AbortUploadsModalProps> = ({
  abortAll,
}) => {
  const { t } = useCustomTranslation();
  const [isModalOpen, setModalOpen] = React.useState(false);

  return (
    <>
      <Button variant={ButtonVariant.link} onClick={() => setModalOpen(true)}>
        {t('Cancel upload')}
      </Button>
      <Modal
        title={t('Cancel all ongoing uploads?')}
        titleIconVariant="warning"
        isOpen={isModalOpen}
        variant={ModalVariant.medium}
        actions={[
          <ButtonBar inProgress={false} errorMessage={null}>
            <span>
              <Button
                variant={ButtonVariant.primary}
                onClick={abortAll}
                className="pf-v5-u-mr-xs"
              >
                {t('Yes, cancel')}
              </Button>
              <Button
                variant={ButtonVariant.secondary}
                onClick={() => setModalOpen(false)}
                className="pf-v5-u-ml-xs"
              >
                {t('No, continue uploads')}
              </Button>
            </span>
          </ButtonBar>,
        ]}
      >
        <Trans t={t}>
          Are you sure you want to cancel the ongoing uploads? Any files
          currently being uploaded will be stopped, and partially uploaded files
          will not be saved.
        </Trans>
      </Modal>
    </>
  );
};
