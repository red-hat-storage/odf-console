import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@patternfly/react-core';
import './Badge.scss';

const TechPreviewBadge: React.FC = () => {
  const { t } = useTranslation('plugin__odf-console');
  return <Label className="ocs-preview-badge">{t('Tech preview')}</Label>;
};

export default TechPreviewBadge;
