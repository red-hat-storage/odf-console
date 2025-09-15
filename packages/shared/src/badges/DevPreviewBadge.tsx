import * as React from 'react';
import classNames from 'classnames';
import { Label } from '@patternfly/react-core';
import './Badge.scss';
import { useCustomTranslation } from '../useCustomTranslationHook';

type DevPreviewBadgeProps = {
  className?: string;
};

const DevPreviewBadge: React.FC<DevPreviewBadgeProps> = ({ className }) => {
  const { t } = useCustomTranslation();
  return (
    <Label className={classNames('ocs-preview-badge', className)}>
      {t('Dev preview')}
    </Label>
  );
};

export default DevPreviewBadge;
