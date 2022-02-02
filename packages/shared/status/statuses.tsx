import * as React from 'react';
import {
  GreenCheckCircleIcon,
  GenericStatus,
} from '@openshift-console/dynamic-plugin-sdk-internal-kubevirt';
import { useTranslation } from 'react-i18next';
import { StatusComponentProps } from './types';

export const SuccessStatus: React.FC<StatusComponentProps> = (props) => {
  const { t } = useTranslation('plugin_odf-console');
  return (
    <GenericStatus
      {...props}
      Icon={GreenCheckCircleIcon}
      title={props.title || t('Healthy')}
    />
  );
};
SuccessStatus.displayName = 'SuccessStatus';
