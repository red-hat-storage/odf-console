import * as React from 'react';
import { FileSystemKind, LocalDiskKind } from '@odf/core/types/scale';
import {
  getName,
  getNamespace,
  PersistentVolumeClaimModel,
  StorageClassModel,
  StorageClassResourceKind,
} from '@odf/shared';
import { ModalFooter } from '@odf/shared/generic/ModalTitle';
import { StatusBox } from '@odf/shared/generic/status-box';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import {
  CommonModalProps,
  ModalBody,
  ModalHeader,
} from '@odf/shared/modals/Modal';
import { FileSystemModel, LocalDiskModel } from '@odf/shared/models/scale';
import { ListKind, PersistentVolumeClaimKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  k8sDelete,
  k8sList,
  k8sPatch,
  K8sModel,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import * as _ from 'lodash-es';
import { Trans } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import {
  Alert,
  Button,
  FormGroup,
  Spinner,
  TextInput,
} from '@patternfly/react-core';
import './DeleteLUNModal.scss';

export const toList = (text: string[]): React.ReactNode => {
  const containerClass = `delete-lun-modal__list-container${
    text.length > 3 ? ' delete-lun-modal__list-container--scrollable' : ''
  }`;

  return (
    <div className={containerClass}>
      {text.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </div>
  );
};

type DeleteLUNModalProps = CommonModalProps<{
  kindObj?: K8sModel;
  resource: FileSystemKind;
}>;

enum DeletionStatus {
  ALLOWED = 'ALLOWED',
  BOUNDED = 'BOUNDED',
  LOADING = 'LOADING',
}

const getStorageClassName = (pvc: PersistentVolumeClaimKind): string => {
  return pvc?.spec?.storageClassName || '';
};

const DeleteLUNModal: React.FC<DeleteLUNModalProps> = ({
  isOpen,
  closeModal,
  extraProps: { resource },
}) => {
  const { t } = useCustomTranslation();
  const fsName = getName(resource);
  const fsNamespace = getNamespace(resource);

  const [inProgress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState<string>('');
  const [confirmName, setConfirmName] = React.useState('');

  const [storageClass, scLoaded, scLoadError] =
    useK8sGet<StorageClassResourceKind>(StorageClassModel, fsName);
  const [pvcResources, pvcLoaded, pvcLoadError] = useK8sGet<
    ListKind<PersistentVolumeClaimKind>
  >(PersistentVolumeClaimModel);

  const location = useLocation();
  const navigate = useNavigate();

  const isConfirmNameValid = fsName === confirmName;

  const { deletionStatus, boundPVCNames } = React.useMemo(() => {
    if (!scLoaded || !pvcLoaded || scLoadError || pvcLoadError) {
      return {
        deletionStatus: DeletionStatus.LOADING,
        boundPVCNames: [],
      };
    }

    // If storage class doesn't exist, we can proceed with deletion
    if (!storageClass) {
      return {
        deletionStatus: DeletionStatus.ALLOWED,
        boundPVCNames: [],
      };
    }

    // Check if any PVCs are using this storage class
    const pvcScNames: string[] = pvcResources.items?.map(getStorageClassName);
    const usedByPVCs = pvcScNames.includes(fsName);

    if (usedByPVCs) {
      // Get the names of PVCs using this storage class
      const pvcNames = pvcResources.items
        ?.filter((pvc) => getStorageClassName(pvc) === fsName)
        .map((pvc) => getName(pvc));
      return {
        deletionStatus: DeletionStatus.BOUNDED,
        boundPVCNames: pvcNames,
      };
    }

    return {
      deletionStatus: DeletionStatus.ALLOWED,
      boundPVCNames: [],
    };
  }, [
    scLoaded,
    pvcLoaded,
    scLoadError,
    pvcLoadError,
    storageClass,
    pvcResources,
    fsName,
  ]);

  const deleteFileSystem = async () => {
    setInProgress(true);
    setError('');

    try {
      // Apply the allowDelete label before deletion (required for webhook validation)
      await k8sPatch({
        model: FileSystemModel,
        resource,
        data: [
          {
            op: 'add',
            path: '/metadata/labels',
            value: {},
          },
          {
            op: 'add',
            path: '/metadata/labels/scale.spectrum.ibm.com~1allowDelete',
            value: '',
          },
        ],
      });

      // Get all LocalDisks that reference this FileSystem
      const localDisksResponse = await k8sList<LocalDiskKind>({
        model: LocalDiskModel,
        queryParams: { ns: fsNamespace },
      });

      const localDisksList =
        (localDisksResponse as ListKind<LocalDiskKind>).items || [];
      const associatedDisks = localDisksList.filter(
        (disk) => disk.status?.filesystem === fsName
      );

      // Delete StorageClass if it exists
      if (storageClass) {
        try {
          await k8sDelete({
            model: StorageClassModel,
            resource: storageClass,
            requestInit: null,
            json: null,
          });
        } catch (scError) {
          // eslint-disable-next-line no-console
          console.warn('Failed to delete StorageClass:', scError);
          // Continue with deletion even if SC deletion fails
        }
      }

      // Delete FileSystem
      await k8sDelete({
        model: FileSystemModel,
        resource,
        requestInit: null,
        json: null,
      });

      // Delete associated LocalDisks
      await Promise.allSettled(
        associatedDisks.map((disk) =>
          k8sDelete({
            model: LocalDiskModel,
            resource: disk,
            requestInit: null,
            json: null,
          })
        )
      );

      setInProgress(false);
      closeModal();

      // Navigate to list page if we're on the details page
      if (location.pathname.includes(fsName)) {
        navigate(location.pathname.split(`/${fsName}`)[0]);
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t('Failed to delete LUN group')
      );
      setInProgress(false);
    }
  };

  const MODAL_TITLE = (
    <ModalHeader>
      <YellowExclamationTriangleIcon className="co-icon-space-r" />{' '}
      {t('Delete LUN group')}
    </ModalHeader>
  );

  const isLoaded = pvcLoaded && scLoaded;
  const loadError = pvcLoadError || scLoadError;

  return (
    <Modal
      isOpen={isOpen}
      header={MODAL_TITLE}
      variant={ModalVariant.small}
      onClose={closeModal}
    >
      {isLoaded && !loadError ? (
        <>
          <ModalBody>
            {deletionStatus === DeletionStatus.LOADING ? (
              <div className="pf-v5-u-text-align-center">
                <Spinner size="lg" />
                <p className="pf-v5-u-mt-md">{t('Checking dependencies...')}</p>
              </div>
            ) : deletionStatus === DeletionStatus.BOUNDED ? (
              <div>
                <Trans t={t}>
                  <p data-test="lun-bound-message">
                    <strong>{{ fsName }}</strong> cannot be deleted. When a LUN
                    group is being used by PVCs, it cannot be deleted. Please
                    delete all PVCs using this LUN group:
                  </p>
                </Trans>
                <strong>
                  <ul data-test="lun-pvcs">{toList(boundPVCNames)}</ul>
                </strong>
              </div>
            ) : (
              <>
                <Trans t={t}>
                  <p>
                    Deleting <strong>{{ fsName }}</strong> will remove the LUN
                    group along with its associated StorageClass and LocalDisks.
                    All saved data of this LUN group will be removed. Are you
                    sure you want to delete?
                  </p>
                </Trans>
                {storageClass && (
                  <Alert
                    variant="warning"
                    isInline
                    title={t('Resources to be deleted')}
                    className="pf-v5-u-mt-md"
                  >
                    <ul>
                      <li>
                        {t('FileSystem: ')}
                        <strong>{fsName}</strong>
                      </li>
                      <li>
                        {t('StorageClass: ')}
                        <strong>{getName(storageClass)}</strong>
                      </li>
                      <li>
                        {t('All associated LocalDisks for this FileSystem')}
                      </li>
                    </ul>
                  </Alert>
                )}
                <FormGroup
                  label={t('Type {{name}} to confirm', { name: fsName })}
                  fieldId="confirm-name"
                  className="pf-v5-u-mt-md"
                >
                  <TextInput
                    id="confirm-name"
                    aria-label={t('Confirm name')}
                    value={confirmName}
                    onChange={(_event, value) => setConfirmName(value)}
                    data-test="confirm-name-input"
                  />
                </FormGroup>
              </>
            )}
            {error && (
              <Alert
                isInline
                variant="danger"
                title={t('An error occurred')}
                className="pf-v5-u-mt-md"
              >
                {error}
              </Alert>
            )}
          </ModalBody>
          <ModalFooter inProgress={inProgress}>
            <Button
              key="cancel"
              variant="secondary"
              onClick={closeModal}
              data-test="cancel-action"
            >
              {t('Cancel')}
            </Button>
            {deletionStatus === DeletionStatus.ALLOWED && (
              <Button
                key="delete"
                variant="danger"
                onClick={deleteFileSystem}
                isDisabled={inProgress || !isConfirmNameValid}
                data-test="delete-action"
              >
                {t('Delete')}
              </Button>
            )}
          </ModalFooter>
        </>
      ) : (
        <StatusBox
          loaded={isLoaded}
          loadError={loadError}
          label={t('LUN group delete modal')}
        />
      )}
    </Modal>
  );
};

export default DeleteLUNModal;
