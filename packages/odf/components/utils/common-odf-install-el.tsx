import * as React from 'react';
import { CreateStepsSC } from '@odf/core/constants';
import {
  EncryptionType,
  ResourceProfile,
  ValidationType,
  VolumeTypeValidation,
} from '@odf/core/types';
import { getResourceProfileRequirements } from '@odf/core/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { WizardContextConsumer } from '@patternfly/react-core/deprecated';
import classNames from 'classnames';
import { TFunction } from 'react-i18next';
import { Link } from 'react-router-dom-v5-compat';
import { Alert, AlertVariant, AlertActionLink } from '@patternfly/react-core';
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

export const VALIDATIONS = (
  type: keyof typeof ValidationType,
  t: TFunction,
  resourceProfile?: ResourceProfile,
  osdAmount?: number,
  volumeValidationType?: VolumeTypeValidation,
  architecture?: string
): Validation => {
  switch (type) {
    case ValidationType.MINIMAL: {
      const { minCpu, minMem } = getResourceProfileRequirements(
        ResourceProfile.Balanced,
        osdAmount,
        architecture
      );
      return {
        variant: AlertVariant.warning,
        title: (
          <div className="ceph-minimal-deployment-alert__header">
            {t('Deploy a lean mode cluster?')}
          </div>
        ),
        text: t(
          'The selected nodes do not meet the Data Foundation storage cluster requirement of an aggregated {{minCpu}} CPUs and {{minMem}} GiB of RAM. If the requirement is not met, a lean mode cluster will be deployed. You can add more resources now to select a different performance profile, or you can change the profile later by adding more resources.',
          { minCpu, minMem }
        ),
        actionLinkStep: CreateStepsSC.STORAGEANDNODES,
        actionLinkText: t('Back to nodes selection'),
      };
    }
    case ValidationType.RESOURCE_PROFILE:
      return {
        variant: AlertVariant.danger,
        title: t(
          'Aggregate resource requirement for {{resourceProfile}} mode not met',
          { resourceProfile }
        ),
        text: t(
          'The selected nodes do not meet the {{resourceProfile}} mode aggregate resource requirement. Try again by selecting nodes with enough CPU and memory or you can select a different performance profile to proceed.',
          { resourceProfile }
        ),
        actionLinkStep: CreateStepsSC.STORAGEANDNODES,
        actionLinkText: t('Back to nodes selection'),
      };
    case ValidationType.CAPACITY_AUTOSCALING:
      return {
        variant: AlertVariant.danger,
        title: t(
          'Select a cluster expansion limit for automatic capacity scaling to continue.'
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
    case ValidationType.VOLUME_TYPE: {
      if (volumeValidationType === VolumeTypeValidation.ERROR)
        return {
          variant: AlertVariant.danger,
          title: t(
            'Disk type is not compatible with the selected backing storage.'
          ),
          text: t(
            'Data Foundation does not support HDD disk type in internal mode. You are trying to install an unsupported cluster by choosing HDDs as the local devices. To continue installation, select a supported disk type with internal mode.'
          ),
        };
      else if (volumeValidationType === VolumeTypeValidation.INFO)
        return {
          variant: AlertVariant.info,
          title: t(
            'Data Foundation supports only SSD/NVMe disk type for internal mode deployment.'
          ),
        };
      return { title: '', text: '' };
    }
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
  resourceProfile,
  volumeValidationType,
  validation,
  osdAmount,
  architecture,
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
  } = VALIDATIONS(
    validation,
    t,
    resourceProfile,
    osdAmount,
    volumeValidationType,
    architecture
  );
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
  resourceProfile?: ResourceProfile;
  validation: keyof typeof ValidationType;
  osdAmount?: number;
  volumeValidationType?: VolumeTypeValidation;
  architecture?: string;
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
