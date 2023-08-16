import * as React from 'react';

export enum ModalKeys {
  DELETE = 'Delete',
  EDIT_RES = 'Edit Resource',
  EDIT_ANN = 'Edit Annotations',
  EDIT_LABELS = 'Edit Labels',
}

export type ModalMap = {
  [key: string]: React.LazyExoticComponent<any>;
};

export const defaultModalMap: ModalMap = {
  [ModalKeys.DELETE]: React.lazy(() => import('./DeleteModal')),
  [ModalKeys.EDIT_ANN]: React.lazy(() => import('./EditAnnotations')),
  [ModalKeys.EDIT_LABELS]: React.lazy(() => import('./EditLabelModal')),
};
