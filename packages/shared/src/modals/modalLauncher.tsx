import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export enum ModalKeys {
  DELETE = 'Delete',
  EDIT_RES = 'Edit Resource',
  EDIT_ANN = 'Edit Annotations',
  EDIT_LABELS = 'Edit Labels',
}

export type ModalMap = {
  [key: string]: React.LazyExoticComponent<any>;
};

const defaultModalMap: ModalMap = {
  [ModalKeys.DELETE]: React.lazy(() => import('./DeleteModal')),
  [ModalKeys.EDIT_ANN]: React.lazy(() => import('./EditAnnotations')),
  [ModalKeys.EDIT_LABELS]: React.lazy(() => import('./EditLabelModal')),
};

const EmptyJSX: React.FC = () => <></>;

type ExtraProps = {
  resource?: K8sResourceCommon;
  resourceModel?: K8sModel;
  [key: string]: any;
};

export type LaunchModal = (key: string, extraProps: ExtraProps) => void;

export const useModalLauncher = (modals?: ModalMap) => {
  const [isOpen, setOpen] = React.useState(true);
  const [modalKey, setModalKey] = React.useState('');
  const [extraProps, setExtraProps] = React.useState({});

  const modalMap: ModalMap = React.useMemo(
    () => ({ ...defaultModalMap, ...(modals ? modals : {}) }),
    [modals]
  );

  const launchModal: LaunchModal = React.useCallback(
    (key: string, modalExtraProps: any = {}) => {
      setModalKey(key);
      setExtraProps(modalExtraProps);
      setOpen(true);
    },
    [setOpen, setModalKey]
  );

  const onClose = React.useCallback(() => {
    setOpen(false);
    setModalKey('');
    setExtraProps({});
  }, [setOpen, setModalKey]);

  const props = React.useMemo(
    () => ({ isOpen, closeModal: onClose, extraProps }),
    [isOpen, onClose, extraProps]
  );

  return [modalMap[modalKey] || EmptyJSX, props, launchModal] as [
    React.ElementType,
    typeof props,
    LaunchModal
  ];
};
