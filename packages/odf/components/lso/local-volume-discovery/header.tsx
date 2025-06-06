import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import { TextContent, TextVariants, Text } from '@patternfly/react-core';

export const LocalVolumeDiscoveryHeader: React.FC<LocalVolumeDiscoveryHeaderProps> =
  ({ className }) => {
    const { t } = useCustomTranslation();

    return (
      <TextContent>
        <Text component={TextVariants.h1} className={className}>
          {t('Local Volume Discovery')}
        </Text>
        <TextContent>
          <Text component={TextVariants.p} className="help-block">
            {t(
              'Allows you to discover the available disks on all available nodes'
            )}
          </Text>
        </TextContent>
      </TextContent>
    );
  };

type LocalVolumeDiscoveryHeaderProps = {
  className?: string;
};
