import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Content, ContentVariants } from '@patternfly/react-core';

export const patchMcgPerformanceProfile = async (): Promise<void> => {
  // ToDo: add MCG performance profile patch here.
};

export const McgPerformanceSection: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <div className="pf-v6-u-mb-lg">
      <Content component={ContentVariants.h3} className="pf-v6-u-mb-sm">
        {t('Multicloud Object Gateway')}
      </Content>
      <Content
        component={ContentVariants.small}
        id="object-access-desc"
        className="pf-v6-u-mb-md"
      >
        {t(
          'Optimize Multicloud Object Gateway resource usage for object workload patterns. These settings do not affect Block, File, or RADOS Gateway.'
        )}
      </Content>
    </div>
  );
};
