import * as React from 'react';
import { Button, Popover, PopoverProps } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { useCustomTranslation } from '../useCustomTranslationHook';
import './field-level-help.scss';

export const FieldLevelHelp: React.FC<FieldLevelHelpProps> = React.memo(
  ({ children, popoverHasAutoWidth, testId }) => {
    const { t } = useCustomTranslation();
    if (React.Children.count(children) === 0) {
      return null;
    }
    return (
      <Popover
        aria-label={t('Help')}
        bodyContent={children}
        hasAutoWidth={popoverHasAutoWidth}
      >
        <Button
          aria-label={t('Help')}
          variant="link"
          isInline
          className="odf-field-level-help"
          data-test-id={testId || null}
        >
          <OutlinedQuestionCircleIcon className="odf-field-level-help__icon" />
        </Button>
      </Popover>
    );
  }
);

FieldLevelHelp.displayName = 'FiledLevelHelp';

type FieldLevelHelpProps = {
  children: React.ReactNode;
  popoverHasAutoWidth?: PopoverProps['hasAutoWidth'];
  testId?: string;
};
