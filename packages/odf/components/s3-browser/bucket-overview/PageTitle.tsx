import * as React from 'react';
import { S3ProviderType } from '@odf/core/types';
import { useUserSettingsLocalStorage } from '@odf/shared/hooks/useUserSettingsLocalStorage';
import { resourceStatus as getResourceStatus } from '@odf/shared/status/Resource';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ResourceStatus } from '@openshift-console/dynamic-plugin-sdk';
import Status from '@openshift-console/dynamic-plugin-sdk/lib/app/components/status/Status';
import {
  Label,
  Button,
  ButtonVariant,
  ButtonType,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { CopyIcon, StarIcon } from '@patternfly/react-icons';
import { t_global_color_status_warning_100 as warningColor } from '@patternfly/react-tokens';
import { BUCKET_BOOKMARKS_USER_SETTINGS_KEY } from '../../../constants';
import { getPath, getProviderLabel } from '../../../utils';
import './bucket-overview.scss';

type TitleProps = {
  bucketName: string;
  providerType: S3ProviderType;
  foldersPath: string;
  currentFolder: string;
  isCreatedByOBC: boolean;
  noobaaObjectBucket: K8sResourceKind;
};

type BucketResourceStatusProps = { resourceStatus: string };

type FavoriteProps = { bucketName: string };

const BucketResourceStatus: React.FC<BucketResourceStatusProps> = ({
  resourceStatus,
}) => (
  <ResourceStatus additionalClassNames="bucket-label--margin-top">
    <Status status={resourceStatus} />
  </ResourceStatus>
);

const Favorite: React.FC<FavoriteProps> = ({ bucketName }) => {
  const [favorites, setFavorites] = useUserSettingsLocalStorage<string[]>(
    BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
    true,
    []
  );
  const isFavorite = favorites?.find((bucket) => bucket === bucketName);

  const onClick = () => {
    if (isFavorite)
      setFavorites((oldFavorites) =>
        oldFavorites.filter((bucket) => bucket !== bucketName)
      );
    else setFavorites((oldFavorites) => [...oldFavorites, bucketName]);
  };

  return (
    <Button
      icon={<StarIcon color={isFavorite && warningColor.value} />}
      variant={ButtonVariant.plain}
      type={ButtonType.button}
      onClick={onClick}
    />
  );
};

export const PageTitle: React.FC<TitleProps> = ({
  bucketName,
  providerType,
  foldersPath,
  currentFolder,
  isCreatedByOBC,
  noobaaObjectBucket,
}) => {
  const { t } = useCustomTranslation();

  const objectPath = getPath(bucketName, foldersPath);
  const resourceStatus = isCreatedByOBC
    ? getResourceStatus(noobaaObjectBucket)
    : null;
  const createdBy = isCreatedByOBC ? t('Created via OBC') : t('Created via S3');

  return (
    <div className="pf-v6-u-display-flex pf-v6-u-flex-direction-column">
      <div className="pf-v6-u-display-flex pf-v6-u-flex-direction-row">
        {!foldersPath ? bucketName : currentFolder}
        {!foldersPath && (
          <>
            <Favorite bucketName={bucketName} />
            <Label
              color="yellow"
              className="pf-v6-u-mt-sm bucket-label--height"
              isCompact
            >
              {getProviderLabel(providerType)}
            </Label>
            <Label
              className="pf-v6-u-ml-sm pf-v6-u-mt-sm bucket-label--height"
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
      <Content>
        <Content component={ContentVariants.h4}>
          {t('Object path: ')}
          <span className="text-muted">{objectPath}</span>
          <Button
            icon={<CopyIcon className="pf-v6-u-mr-sm" />}
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(objectPath);
            }}
            variant={ButtonVariant.link}
          >
            {t('Copy to share')}
          </Button>
        </Content>
      </Content>
    </div>
  );
};
