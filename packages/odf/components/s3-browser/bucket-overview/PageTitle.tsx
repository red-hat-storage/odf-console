import * as React from 'react';
import { resourceStatus as getResourceStatus } from '@odf/shared/status/Resource';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ResourceStatus } from '@openshift-console/dynamic-plugin-sdk';
import Status from '@openshift-console/dynamic-plugin-sdk/lib/app/components/status/Status';
import { Label, Button, ButtonVariant } from '@patternfly/react-core';
import { CopyIcon } from '@patternfly/react-icons';
import { getPath } from '../../../utils';
import './bucket-overview.scss';

type TitleProps = {
  bucketName: string;
  foldersPath: string;
  currentFolder: string;
  isCreatedByOBC: boolean;
  noobaaObjectBucket: K8sResourceKind;
};

const BucketResourceStatus: React.FC<{ resourceStatus: string }> = ({
  resourceStatus,
}) => (
  <ResourceStatus additionalClassNames="bucket-label--margin-top">
    <Status status={resourceStatus} />
  </ResourceStatus>
);

export const PageTitle: React.FC<TitleProps> = ({
  bucketName,
  foldersPath,
  currentFolder,
  isCreatedByOBC,
  noobaaObjectBucket,
}) => {
  const { t } = useCustomTranslation();

  // ToDo: add object name to the path as well (when any object is clicked from the list)
  const objectPath = getPath(bucketName, foldersPath);
  const resourceStatus = isCreatedByOBC
    ? getResourceStatus(noobaaObjectBucket)
    : null;
  const createdBy = isCreatedByOBC ? t('Created via OBC') : t('Created via S3');

  return (
    <div className="pf-v5-u-display-flex pf-v5-u-flex-direction-column">
      <div className="pf-v5-u-display-flex pf-v5-u-flex-direction-row">
        {!foldersPath ? bucketName : currentFolder}
        {!foldersPath && (
          <>
            {/* ToDo: Currently we only support MCG, make is configurable once RGW is supported as well */}
            <Label
              color="gold"
              className="pf-v5-u-ml-sm pf-v5-u-mt-sm bucket-label--height"
              isCompact
            >
              {t('MCG')}
            </Label>
            <Label
              className="pf-v5-u-ml-sm pf-v5-u-mt-sm bucket-label--height"
              isCompact
            >
              {createdBy}
            </Label>
            {resourceStatus && (
              <BucketResourceStatus resourceStatus={resourceStatus} />
            )}
          </>
        )}
      </div>
      <h4>
        {t('Object path: ')}
        <span className="text-muted">{objectPath}</span>
        <Button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(objectPath);
          }}
          variant={ButtonVariant.link}
        >
          <CopyIcon className="pf-v5-u-mr-sm" />
          {t('Copy to share')}
        </Button>
      </h4>
    </div>
  );
};
