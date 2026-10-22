import * as React from 'react';
import { DRPlacementControlModel } from '@odf/shared';
import { StatusBox } from '@odf/shared/generic';
import { ModalBody, ModalFooter } from '@odf/shared/modals/Modal';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage } from '@odf/shared/utils';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { TFunction } from 'i18next';
import {
  Button,
  ButtonType,
  ButtonVariant,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { DRActionType } from '../../../constants';
import { getStartTestFailoverPatch } from '../../../utils';
import {
  ApplicationProps,
  PlacementControlProps,
  FailoverRelocateModalBody,
} from './failover-relocate-modal-body';

export enum ModalFooterStatus {
  INITIAL = 'intial',
  INPROGRESS = 'inProgress',
}

const getTestFailoverModalText = (t: TFunction) => ({
  title: t('Test failover application'),
  description: t(
    'Testing brings up your application on the selected target cluster without stopping it on the primary cluster. Use it to verify that the application recovers on the target cluster.'
  ),
});

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

const getInitiateButtonText = (
  t: TFunction,
  footerStatus: ModalFooterStatus,
  isTestFailover: boolean
): string => {
  const isInitial = footerStatus === ModalFooterStatus.INITIAL;
  if (isTestFailover) {
    return isInitial ? t('Start') : t('Starting');
  }
  return isInitial ? t('Initiate') : t('Initiating');
};

export const FailoverRelocateModal: React.FC<FailoverRelocateModalProps> = (
  props
) => {
  const {
    applicationNamespace,
    action,
    isOpen,
    loaded,
    loadError,
    close,
    isTestFailover,
  } = props;

  const { t } = useCustomTranslation();
  const modalText = isTestFailover
    ? getTestFailoverModalText(t)
    : getModalText(t)[action];
  const [errorMessage, setErrorMessage] = React.useState('');
  const [footerStatus, setFooterStatus] = React.useState(
    ModalFooterStatus.INITIAL
  );
  const [placementControl, setPlacementControl] =
    React.useState<PlacementControlProps>({});
  const [canInitiate, setCanInitiate] = React.useState(false);

  const onClick = () => {
    setFooterStatus(ModalFooterStatus.INPROGRESS);
    // Preferred cluster and failover cluster should not be the same for failover and relocate.
    const patch = [
      {
        op: 'replace',
        path: '/spec/action',
        value: action,
      },
      {
        op: 'replace',
        path: '/spec/failoverCluster',
        value:
          action === DRActionType.FAILOVER
            ? placementControl?.targetClusterName
            : placementControl?.primaryClusterName,
      },
      {
        op: 'replace',
        path: '/spec/preferredCluster',
        value:
          action === DRActionType.FAILOVER
            ? placementControl?.primaryClusterName
            : placementControl?.targetClusterName,
      },
      ...(isTestFailover ? getStartTestFailoverPatch() : []),
    ];
    k8sPatch({
      model: DRPlacementControlModel,
      resource: {
        metadata: {
          name: placementControl?.drPlacementControlName,
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
              setPlacement={setPlacementControl}
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
          key="modal-initiate-action"
          id={'modal-initiate-action'}
          data-test-id={'modal-initiate-action'}
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
          {getInitiateButtonText(t, footerStatus, isTestFailover)}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

type FailoverRelocateModalProps = ApplicationProps & {
  isOpen: boolean;
  close?: () => void;
};
