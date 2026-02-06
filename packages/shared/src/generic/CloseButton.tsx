import * as React from 'react';
import classNames from 'classnames';
import { Button } from '@patternfly/react-core';
import { CloseIcon } from '@patternfly/react-icons';
import { useCustomTranslation } from '../useCustomTranslationHook';

type CloseButtonProps = {
  additionalClassName?: string;
  ariaLabel?: string;
  dataTestID?: string;
  onClick: (e: any) => void;
};

const CloseButton: React.FC<CloseButtonProps> = ({
  additionalClassName,
  ariaLabel,
  dataTestID,
  onClick,
}) => {
  const { t } = useCustomTranslation();
  return (
    <Button
      icon={<CloseIcon />}
      aria-label={ariaLabel || t('Close')}
      className={classNames('co-close-button', additionalClassName)}
      data-test-id={dataTestID}
      onClick={onClick}
      variant="plain"
    />
  );
};

export default CloseButton;
