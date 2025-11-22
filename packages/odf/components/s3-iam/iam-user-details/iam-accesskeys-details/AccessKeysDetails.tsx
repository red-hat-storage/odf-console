import * as React from 'react';
import { AccessKeyMetadata, Tag } from '@aws-sdk/client-iam';
import { useCustomTranslation } from '@odf/shared';
import { SectionHeading } from '@odf/shared/heading/page-heading';
import { MAX_ACCESS_KEYS } from '@odf/shared/iam';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import {
  Alert,
  AlertVariant,
  Button,
  Grid,
  Spinner,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { GenerateAnotherAccessKeyModal } from '../../modals/GenerateAnotherAccessKeyModal';
import './AccessKeysDetails.scss';
import AccessKeyCard from './AccessKeyCard';

type IAMAccesskeysDetailsProps = {
  obj: {
    userName: string;
    iamAccessKeys: AccessKeyMetadata[];
    tags: Tag[];
    isLoading: boolean;
    error: any;
    refetchAll?: () => Promise<void>;
    noobaaS3IAM?: any;
  };
};

/**
 * Displays AccessKeysDetails in a Card.
 * Create Another Accesskey if only one Accesskey exists
 * @param userName @param iamAccessKeys @param tags @param refetchAll @param noobaaS3IAM
 */
export const IAMAccessKeysDetails: React.FC<IAMAccesskeysDetailsProps> = ({
  obj,
}) => {
  const { t } = useCustomTranslation();
  const launchModal = useModal();

  const {
    userName,
    iamAccessKeys,
    tags,
    /* eslint-disable @typescript-eslint/no-unused-vars */
    refetchAll,
    noobaaS3IAM,
  } = obj;
  const isLoading = false;

  const launchModalOnClick = (modalComponent: ModalComponent) => () => {
    launchModal(modalComponent, {
      isOpen: true,
      userName,
      refetchAll,
      noobaaS3IAM,
    });
  };

  return (
    <div className="odf-m-pane__body">
      <div className="row pf-v5-u-mt-md">
        <div className="col-sm-12">
          <SectionHeading text={t('Access Keys')} />
          {isLoading ? (
            <div className="pf-v5-u-text-align-center pf-v5-u-p-lg">
              <Spinner size="lg" />
            </div>
          ) : iamAccessKeys.length > 0 ? (
            <>
              <Alert
                title={t('You can define only {{maxKeys}} access keys', {
                  maxKeys: MAX_ACCESS_KEYS,
                })}
                variant={AlertVariant.info}
                isInline
              >
                {t('State the reason, how it is helpful')}
              </Alert>
              <Grid hasGutter>
                {iamAccessKeys.map(
                  (iamAccessKey: AccessKeyMetadata, index: number) => (
                    <AccessKeyCard
                      key={iamAccessKey.AccessKeyId}
                      accessKeyCard={iamAccessKey}
                      accessKeyNumber={index + 1}
                      tags={tags}
                      refetchAll={refetchAll}
                      noobaaS3IAM={noobaaS3IAM}
                    />
                  )
                )}
              </Grid>
              {iamAccessKeys.length < MAX_ACCESS_KEYS && (
                <Button
                  variant="secondary"
                  onClick={launchModalOnClick(GenerateAnotherAccessKeyModal)}
                  icon={<PlusCircleIcon />}
                  aria-label={t('Generate another access key')}
                >
                  {t('Generate another access key')}
                </Button>
              )}
            </>
          ) : (
            <div className="pf-v5-u-text-align-center pf-v5-u-p-lg pf-v5-u-color-200">
              {t('No access keys found')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
