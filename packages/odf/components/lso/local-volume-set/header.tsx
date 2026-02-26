import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import { Content, ContentVariants } from '@patternfly/react-core';

export const LocalVolumeSetHeader: React.FC<LocalVolumeSetHeaderProps> = ({
  className,
}) => {
  const { t } = useCustomTranslation();

  return (
    <Content>
      <Content component={ContentVariants.h1} className={className}>
        {t('Local Volume Set')}
      </Content>
      <Content>
        <Content component={ContentVariants.p} className="help-block">
          {t(
            'A Local Volume Set allows you to filter a set of disks, group them and create a dedicated StorageClass to consume storage from them.'
          )}
        </Content>
      </Content>
    </Content>
  );
};

type LocalVolumeSetHeaderProps = {
  className?: string;
};
