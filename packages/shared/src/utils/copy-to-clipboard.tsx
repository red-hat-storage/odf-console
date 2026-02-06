import * as React from 'react';
import cn from 'classnames';
import * as _ from 'lodash-es';
import { CopyToClipboard as CTC } from 'react-copy-to-clipboard';
import { Button, Tooltip } from '@patternfly/react-core';
import { CopyIcon } from '@patternfly/react-icons';
import { useCustomTranslation } from '../useCustomTranslationHook';
import '../style.scss';

type CopyToClipboardWrapperProps = {
  visibleValue: React.ReactNode;
  iconOnly?: boolean;
};

const CopyToClipboardWrapper: React.FC<CopyToClipboardWrapperProps> = ({
  visibleValue,
  iconOnly,
  children,
}) => {
  return iconOnly ? (
    <>{children}</>
  ) : (
    <div className="odf-copy-to-clipboard">
      <pre
        className="odf-pre-wrap odf-copy-to-clipboard__text odf-copy-to-clipboard__pre"
        data-test="copy-to-clipboard"
      >
        {visibleValue}
      </pre>
      {children}
    </div>
  );
};

export const CopyToClipboard: React.FC<CopyToClipboardProps> = React.memo(
  (props) => {
    const [copied, setCopied] = React.useState(false);

    const { t } = useCustomTranslation();
    const tooltipText = copied ? t('Copied') : t('Copy to clipboard');
    const tooltipContent = [
      <span className="co-nowrap" key="nowrap">
        {tooltipText}
      </span>,
    ];

    // Default to value if no visible value was specified.
    const visibleValue = _.isNil(props.visibleValue)
      ? props.value
      : props.visibleValue;

    return (
      <CopyToClipboardWrapper
        visibleValue={visibleValue}
        iconOnly={props.iconOnly}
      >
        <Tooltip
          content={tooltipContent}
          trigger="click mouseenter focus"
          exitDelay={1250}
        >
          <CTC text={props.value} onCopy={() => setCopied(true)}>
            <Button
              icon={
                <>
                  <CopyIcon />
                  <span className="sr-only">{t('Copy to clipboard')}</span>
                </>
              }
              variant="plain"
              onMouseEnter={() => setCopied(false)}
              className={cn(
                'odf-copy-to-clipboard__btn',
                'pf-v5-c-clipboard-copy__group-copy',
                { 'odf-copy-to-clipboard__btn--icon-only': props.iconOnly }
              )}
              type="button"
              data-test="copy-to-clipboard-btn"
            />
          </CTC>
        </Tooltip>
      </CopyToClipboardWrapper>
    );
  }
);

export type CopyToClipboardProps = {
  value: string;
  visibleValue?: React.ReactNode;
  iconOnly?: boolean;
};

CopyToClipboard.displayName = 'CopyToClipboard';
