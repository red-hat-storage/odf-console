import * as React from 'react';
import { Label } from '@patternfly/react-core';
import './Badge.scss';
import { useCustomTranslation } from '../useCustomTranslationHook';

const TechPreviewBadge: React.FC = () => {
  const { t } = useCustomTranslation();
  return <Label className="ocs-preview-badge">{t('Tech preview')}</Label>;
};

export default TechPreviewBadge;
