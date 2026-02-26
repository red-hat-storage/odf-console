import * as React from 'react';
import { ButtonBar, useCustomTranslation } from '@odf/shared';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { observer } from 'mobx-react-lite';
import { Trans } from 'react-i18next';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { uploadStore } from '../../../components/s3-browser/upload-objects/store';

type AbortUploadsModalProps = {
  abortAll: () => void;
};

export const AbortUploadsModal: React.FC<AbortUploadsModalProps> = observer(
  ({ abortAll }) => {
    const { t } = useCustomTranslation();
    const [isModalOpen, setModalOpen] = React.useState(false);
    const onAbort = () => {
      abortAll();
      uploadStore.abortAll();
      setModalOpen(false);
    };

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
                  onClick={onAbort}
                  className="pf-v6-u-mr-xs"
                >
                  {t('Yes, cancel')}
                </Button>
                <Button
                  variant={ButtonVariant.secondary}
                  onClick={() => setModalOpen(false)}
                  className="pf-v6-u-ml-xs"
                >
                  {t('No, continue uploads')}
                </Button>
              </span>
            </ButtonBar>,
          ]}
        >
          <Trans t={t}>
            Are you sure you want to cancel the ongoing uploads? Any files
            currently being uploaded will be stopped, and partially uploaded
            files will not be saved.
          </Trans>
        </Modal>
      </>
    );
  }
);
