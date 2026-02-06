import * as React from 'react';
import {
  DO_NOT_DELETE_PVC_ANNOTATION_WO_SLASH,
  PROTECTED_APP_ANNOTATION,
  PROTECTED_APP_ANNOTATION_WO_SLASH,
} from '@odf/mco/constants';
import { DRPlacementControlKind } from '@odf/mco/types';
import { ACMPlacementModel, DRPlacementControlModel } from '@odf/shared';
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  CommonModalProps,
} from '@odf/shared/modals';
import { getAnnotations, getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage } from '@odf/shared/utils';
import {
  K8sResourceKind,
  k8sDelete,
  k8sGet,
  k8sPatch,
} from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { Trans } from 'react-i18next';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';

// ToDo(Gowtham): https://github.com/red-hat-storage/odf-console/issues/1449
const pvcAnnotationPatchPromise = async (
  application: DRPlacementControlKind
) => {
  const patch = [
    {
      op: 'add',
      path: `/metadata/annotations/${DO_NOT_DELETE_PVC_ANNOTATION_WO_SLASH}`,
      value: 'true',
    },
  ];

  return k8sPatch({
    model: DRPlacementControlModel,
    resource: {
      metadata: {
        name: getName(application),
        namespace: getNamespace(application),
      },
    },
    data: patch,
  });
};

const experimentalAnnotationRemovalPatchPromise = async (
  application: DRPlacementControlKind
) => {
  try {
    const name = application.spec.placementRef.name;
    const namespace = getNamespace(application);

    const placement = await k8sGet({
      model: ACMPlacementModel,
      name,
      ns: namespace,
    });

    const annotations = getAnnotations(placement, {});

    if (!annotations || !annotations[PROTECTED_APP_ANNOTATION]) {
      return Promise.resolve();
    }

    const patch = [
      {
        op: 'remove',
        path: `/metadata/annotations/${PROTECTED_APP_ANNOTATION_WO_SLASH}`,
      },
    ];

    return k8sPatch({
      model: ACMPlacementModel,
      resource: placement,
      data: patch,
    });
  } catch (err) {
    return Promise.reject(err);
  }
};

// ToDo(Gowtham): https://github.com/red-hat-storage/odf-console/issues/1449
const deleteApplicationResourcePromise = (
  application: DRPlacementControlKind
) => {
  // Delete DRPC and dummy placement after updating the annotation
  const promises: Promise<K8sResourceKind>[] = [];
  const { name, namespace } = application?.spec?.placementRef;

  promises.push(
    k8sDelete({
      resource: application,
      model: DRPlacementControlModel,
      json: null,
      requestInit: null,
    })
  );

  promises.push(
    k8sDelete({
      resource: {
        metadata: {
          name: name,
          namespace: namespace,
        },
      },
      model: ACMPlacementModel,
      json: null,
      requestInit: null,
    })
  );

  return promises;
};

const RemoveDisasterRecoveryModal: React.FC<
  CommonModalProps<RemoveDisasterRecoveryProps>
> = ({ closeModal, isOpen, extraProps: { application } }) => {
  const { t } = useCustomTranslation();

  const [isInprogress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState();

  const onRemove = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await experimentalAnnotationRemovalPatchPromise(application);
      await pvcAnnotationPatchPromise(application);
      await Promise.all(deleteApplicationResourcePromise(application));
      closeModal();
    } catch (err) {
      setError(err);
      setInProgress(false);
    }
  };

  return (
    <Modal
      variant={ModalVariant.small}
      header={
        <ModalHeader>
          <ExclamationTriangleIcon
            color="var(--pf-t--temp--dev--tbd)" /* CODEMODS: original v5 color was --pf-v5-global--warning-color--100 */
            className="icon--spacer"
          />
          {t('Remove disaster recovery?')}
        </ModalHeader>
      }
      isOpen={isOpen}
      onClose={closeModal}
      showClose={false}
      hasNoBodyWrapper={true}
    >
      <ModalBody>
        <Trans t={t}>
          Your application{' '}
          <strong>{{ resourceName: getName(application) }}</strong> will lose
          disaster recovery protection, preventing volume synchronization
          (replication) between clusters.
        </Trans>
        {!!error && (
          <Alert
            isInline
            variant={AlertVariant.danger}
            title={t('An error occurred')}
          >
            {getErrorMessage(error) || error}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          key="cancel"
          variant={ButtonVariant.secondary}
          onClick={closeModal}
          data-test="cancel-action"
        >
          {t('Cancel')}
        </Button>
        <Button
          key="remove"
          variant={ButtonVariant.danger}
          onClick={onRemove}
          data-test="remove-action"
          isLoading={isInprogress}
        >
          {t('Remove')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

type RemoveDisasterRecoveryProps = {
  application: DRPlacementControlKind;
};

export default RemoveDisasterRecoveryModal;
