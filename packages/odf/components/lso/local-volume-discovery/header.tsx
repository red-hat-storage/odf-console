import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import { Content, ContentVariants } from '@patternfly/react-core';

export const LocalVolumeDiscoveryHeader: React.FC<
  LocalVolumeDiscoveryHeaderProps
> = ({ className }) => {
  const { t } = useCustomTranslation();

  return (
    <Content>
      <Content component={ContentVariants.h1} className={className}>
        {t('Local Volume Discovery')}
      </Content>
      <Content>
        <Content component={ContentVariants.p} className="help-block">
          {t(
            'Allows you to discover the available disks on all available nodes'
          )}
        </Content>
      </Content>
    </Content>
  );
};

type LocalVolumeDiscoveryHeaderProps = {
  className?: string;
};
