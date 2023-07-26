import * as React from 'react';
import { StatusBox } from '@odf/shared/generic';
import { ModalBody, ModalFooter } from '@odf/shared/modals/Modal';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage } from '@odf/shared/utils';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import {
  Modal,
  Button,
  ModalVariant,
  ButtonType,
  ButtonVariant,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { DRActionType } from '../../../constants';
import { DRPlacementControlModel } from '../../../models';
import {
  ApplicationProps,
  PlacementProps,
  FailoverRelocateModalBody,
} from './failover-relocate-modal-body';

export enum ModalFooterStatus {
  INITIAL = 'intial',
  INPROGRESS = 'inProgress',
}

const getModalText = (t: TFunction) => ({
  [DRActionType.FAILOVER]: {
    title: t('Failover application'),
    description: t(
      'Failing over force stops active replication and deploys your application on the selected target cluster. Recommended only when the primary cluster is down.'
    ),
  },
  [DRActionType.RELOCATE]: {
    title: t('Relocate application'),
    description: t(
      'Relocating terminates your application on its current cluster, syncs its most recent snapshot to the selected target cluster, and then brings up your application.'
    ),
  },
});

export const FailoverRelocateModal: React.FC<FailoverRelocateModalProps> = (
  props
) => {
  const { applicationNamespace, action, isOpen, loaded, loadError, close } =
    props;

  const { t } = useCustomTranslation();
  const modalText = getModalText(t)[action];
  const [errorMessage, setErrorMessage] = React.useState('');
  const [footerStatus, setFooterStatus] = React.useState(
    ModalFooterStatus.INITIAL
  );
  const [placement, setPlacement] = React.useState<PlacementProps>({});
  const [canInitiate, setCanInitiate] = React.useState(false);

  const onClick = () => {
    setFooterStatus(ModalFooterStatus.INPROGRESS);
    const patch = [
      {
        op: 'replace',
        path: '/spec/action',
        value: action,
      },
      {
        op: 'replace',
        path:
          action === DRActionType.FAILOVER
            ? '/spec/failoverCluster'
            : '/spec/preferredCluster',
        value: placement?.targetClusterName,
      },
    ];
    k8sPatch({
      model: DRPlacementControlModel,
      resource: {
        metadata: {
          name: placement?.drPlacementControlName,
          namespace: applicationNamespace,
        },
      },
      data: patch,
    })
      .then(() => {
        close();
      })
      .catch((error) => {
        setFooterStatus(ModalFooterStatus.INITIAL);
        setErrorMessage(getErrorMessage(error));
      });
  };

  return (
    <Modal
      title={modalText.title}
      description={modalText.description}
      isOpen={isOpen}
      onClose={close}
      variant={ModalVariant.medium}
    >
      <ModalBody>
        {loaded && !loadError ? (
          <>
            <FailoverRelocateModalBody
              {...props}
              canInitiate={canInitiate}
              setCanInitiate={setCanInitiate}
              setPlacement={setPlacement}
            />
            {(!!errorMessage || !!loadError) && (
              <Alert
                title={errorMessage || getErrorMessage(loadError)}
                variant={AlertVariant.danger}
                isInline
              />
            )}
          </>
        ) : (
          <StatusBox loaded={loaded} loadError={loadError} />
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          key="modal-cancel-action"
          id={'modal-cancel-action'}
          data-test-id={'modal-cancel-action'}
          type={ButtonType.button}
          variant={ButtonVariant.link}
          onClick={close}
        >
          {t('Cancel')}
        </Button>
        <Button
          key="modal-intiate-action"
          id={'modal-intiate-action'}
          data-test-id={'modal-intiate-action'}
          type={ButtonType.button}
          variant={ButtonVariant.primary}
          isDisabled={
            !canInitiate ||
            !!loadError ||
            footerStatus === ModalFooterStatus.INPROGRESS
          }
          isLoading={footerStatus === ModalFooterStatus.INPROGRESS}
          onClick={onClick}
        >
          {footerStatus === ModalFooterStatus.INITIAL
            ? t('Initiate')
            : t('Initiating')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

type FailoverRelocateModalProps = ApplicationProps & {
  isOpen: boolean;
  close?: () => void;
};
