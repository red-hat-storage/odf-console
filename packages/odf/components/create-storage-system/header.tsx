import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { TextVariants, Text, TextContent } from '@patternfly/react-core';
import './create-storage-system.scss';

export const CreateStorageSystemHeader: React.FC<CreateStorageSystemHeaderProps> =
  ({ url }) => {
    const { t } = useTranslation('plugin__odf-console');
    return (
      <div className="odf-create-storage-system__header">
        <TextContent>
          <Text component={TextVariants.h1}>{t('Create StorageSystem')}</Text>
          <Text component={TextVariants.small}>
            {t(
              'Create a StorageSystem to represent your OpenShift Data Foundation system and all its required storage and computing resources.'
            )}
          </Text>
        </TextContent>
      </div>
    );
  };

type CreateStorageSystemHeaderProps = {
  url: string;
};
