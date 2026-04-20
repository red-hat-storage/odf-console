import * as React from 'react';
import { Label } from '@patternfly/react-core';
import './Badge.scss';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { useCustomTranslation } from '../useCustomTranslationHook';

const TechPreviewBadge: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Label icon={<InfoCircleIcon />} className="ocs-preview-badge" color="teal">
      {t('Technology preview')}
    </Label>
  );
};

export default TechPreviewBadge;
