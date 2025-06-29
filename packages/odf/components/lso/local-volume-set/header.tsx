import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import { TextContent, TextVariants, Text } from '@patternfly/react-core';

export const LocalVolumeSetHeader: React.FC<LocalVolumeSetHeaderProps> = ({
  className,
}) => {
  const { t } = useCustomTranslation();

  return (
    <TextContent>
      <Text component={TextVariants.h1} className={className}>
        {t('Local Volume Set')}
      </Text>
      <TextContent>
        <Text component={TextVariants.p} className="help-block">
          {t(
            'A Local Volume Set allows you to filter a set of disks, group them and create a dedicated StorageClass to consume storage from them.'
          )}
        </Text>
      </TextContent>
    </TextContent>
  );
};

type LocalVolumeSetHeaderProps = {
  className?: string;
};
