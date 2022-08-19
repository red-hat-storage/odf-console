import * as React from 'react';
import { useModalLauncher } from '@odf/shared/modals/modalLauncher';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

const ALERT_MODAL_KEY = 'ALERT_MODAL';

const extraMap = {
  [ALERT_MODAL_KEY]: React.lazy(() => import('./default-add-capacity-modal')),
};

type CustomData = {
  key?: string;
  extraProps: {
    resource?: K8sResourceCommon;
    resourceModel?: K8sModel;
    [key: string]: any;
  };
};

export const expansionModal = (key, extraProps) => (
  <ClusterExpansionModal key={key} extraProps={extraProps} />
);

export const ClusterExpansionModal: React.FC<CustomData> = ({
  key,
  extraProps,
}) => {
  const [ModalComponent, props, launcher] = useModalLauncher(extraMap);

  return (
    <>
      <ModalComponent {...props} />
      {launcher(key, extraProps)}
    </>
  );
};
