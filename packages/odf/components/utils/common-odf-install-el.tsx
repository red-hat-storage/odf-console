import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import classNames from 'classnames';
import { TFunction } from 'i18next';
import { Link } from 'react-router-dom';
import {
  Alert,
  AlertVariant,
  AlertActionLink,
  WizardContextConsumer,
} from '@patternfly/react-core';
import { CreateStepsSC } from '../../constants';
import { EncryptionType } from '../../types';
import './odf-install.scss';

export type Validation = {
  title: React.ReactNode;
  text?: string;
  variant?: keyof typeof AlertVariant;
  link?: string;
  linkText?: string;
  actionLinkText?: string;
  actionLinkStep?: string;
};

export enum ValidationType {
  'MINIMAL' = 'MINIMAL',
  'INTERNALSTORAGECLASS' = 'INTERNALSTORAGECLASS',
  'BAREMETALSTORAGECLASS' = 'BAREMETALSTORAGECLASS',
  'ALLREQUIREDFIELDS' = 'ALLREQUIREDFIELDS',
  'MINIMUMNODES' = 'MINIMUMNODES',
  'ENCRYPTION' = 'ENCRYPTION',
  'REQUIRED_FIELD_KMS' = 'REQUIRED_FIELD_KMS',
  'NETWORK' = 'NETWORK',
  'INTERNAL_FLEXIBLE_SCALING' = 'INTERNAL_FLEXIBLE_SCALING',
  'ATTACHED_DEVICES_FLEXIBLE_SCALING' = 'ATTACHED_DEVICES_FLEXIBLE_SCALING',
}

export const VALIDATIONS = (
  type: keyof typeof ValidationType,
  t: TFunction
): Validation => {
  switch (type) {
    case ValidationType.MINIMAL:
      return {
        variant: AlertVariant.warning,
        title: (
          <div className="ceph-minimal-deployment-alert__header">
            {t('A minimal cluster deployment will be performed.')}
          </div>
        ),
        text: t(
          "The selected nodes do not match Data Foundation's StorageCluster requirement of an aggregated 30 CPUs and 72 GiB of RAM. If the selection cannot be modified a minimal cluster will be deployed."
        ),
        actionLinkStep: CreateStepsSC.STORAGEANDNODES,
        actionLinkText: t('Back to nodes selection'),
      };
    case ValidationType.INTERNALSTORAGECLASS:
      return {
        variant: AlertVariant.danger,
        title: t('Select a StorageClass to continue'),
        text: t(
          'This is a required field. The StorageClass will be used to request storage from the underlying infrastructure to create the backing PersistentVolumes that will be used to provide the Data Foundation service.'
        ),
        link: '/k8s/cluster/storageclasses/~new/form',
        linkText: t('Create new StorageClass'),
      };
    case ValidationType.BAREMETALSTORAGECLASS:
      return {
        variant: AlertVariant.danger,
        title: t('Select a StorageClass to continue'),
        text: t(
          'This is a required field. The StorageClass will be used to request storage from the underlying infrastructure to create the backing persistent volumes that will be used to provide the Data Foundation service.'
        ),
      };
    case ValidationType.ALLREQUIREDFIELDS:
      return {
        variant: AlertVariant.danger,
        title: t('All required fields are not set'),
        text: t(
          'In order to create the StorageCluster you must set the StorageClass, select at least 3 nodes (preferably in 3 different zones) and meet the minimum or recommended requirement'
        ),
      };
    case ValidationType.MINIMUMNODES:
      return {
        variant: AlertVariant.danger,
        title: t('Minimum Node Requirement'),
        text: t(
          'The StorageCluster requires a minimum of 3 nodes for the initial deployment. Please choose a different StorageClass or go to create a new LocalVolumeSet that matches the minimum node requirement.'
        ),
        actionLinkText: t('Create new volume set instance'),
        actionLinkStep: CreateStepsSC.DISCOVER,
      };
    case ValidationType.ENCRYPTION:
      return {
        variant: AlertVariant.danger,
        title: t('All required fields are not set'),
        text: t('Select at least 1 encryption level or disable encryption.'),
      };
    case ValidationType.REQUIRED_FIELD_KMS:
      return {
        variant: AlertVariant.danger,
        title: t(
          'Fill out the details in order to connect to key management system'
        ),
        text: t('This is a required field.'),
      };
    case ValidationType.NETWORK:
      return {
        variant: AlertVariant.danger,
        title: t(
          'Both public and cluster network attachment definition cannot be empty'
        ),
        text: t(
          'A public or cluster network attachment definition must be selected to use Multus.'
        ),
      };
    case ValidationType.INTERNAL_FLEXIBLE_SCALING:
      return {
        variant: AlertVariant.info,
        title: t(
          'The number of selected zones is less than the minimum requirement of 3. If not modified a host-based failure domain deployment will be enforced.'
        ),
      };
    case ValidationType.ATTACHED_DEVICES_FLEXIBLE_SCALING:
      return {
        variant: AlertVariant.info,
        title: t(
          'When the nodes in the selected StorageClass are spread across fewer than 3 availability zones, the StorageCluster will be deployed with the host based failure domain.'
        ),
      };
    default:
      return { title: '', text: '' };
  }
};

export const ActionAlert: React.FC<ActionAlertProps> = ({
  variant = AlertVariant.info,
  title,
  text,
  actionLinkText,
  actionLinkStep,
  className,
}) => (
  <WizardContextConsumer>
    {({ goToStepById }) => (
      <Alert
        className={classNames('co-alert', className)}
        variant={variant}
        title={title}
        isInline
        actionLinks={
          actionLinkStep &&
          actionLinkText && (
            <AlertActionLink onClick={() => goToStepById(actionLinkStep)}>
              {actionLinkText}
            </AlertActionLink>
          )
        }
      >
        {text && <p>{text}</p>}
      </Alert>
    )}
  </WizardContextConsumer>
);

type ActionAlertProps = Validation & {
  className?: string;
};

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  className,
  validation,
}) => {
  const { t } = useCustomTranslation();
  const {
    variant = AlertVariant.info,
    title,
    text,
    link,
    linkText,
    actionLinkStep,
    actionLinkText,
  } = VALIDATIONS(validation, t);
  return actionLinkStep ? (
    <Alert
      className={classNames('co-alert', className)}
      variant={variant}
      title={title}
      isInline
    >
      <p>{text}</p>
      {link && linkText && <Link to={link}>{linkText}</Link>}
    </Alert>
  ) : (
    <ActionAlert
      title={title}
      text={text}
      variant={variant}
      actionLinkText={actionLinkText}
      actionLinkStep={actionLinkStep}
    />
  );
};

type ValidationMessageProps = {
  className?: string;
  validation: keyof typeof ValidationType;
};

export const getEncryptionLevel = (obj: EncryptionType, t: TFunction) => {
  if (obj.clusterWide && obj.storageClass) {
    return t('Cluster-Wide and StorageClass');
  }
  if (obj.clusterWide) {
    return t('Cluster-Wide');
  }
  return t('StorageClass');
};
