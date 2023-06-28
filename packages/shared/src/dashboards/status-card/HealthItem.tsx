import * as React from 'react';
import SecondaryStatus from '@odf/shared/status/SecondaryStatus';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import { Button, Popover, PopoverPosition } from '@patternfly/react-core';
import { useCustomTranslation } from '../../useCustomTranslationHook';
import { healthStateMapping, healthStateMessage } from './states';

export type HealthItemProps = {
  className?: string;
  title: string;
  details?: string;
  state?: HealthState;
  popupTitle?: string;
  noIcon?: boolean;
  icon?: React.ReactNode;
  maxWidth?: string;
  disableDetails?: boolean;
};

const HealthItemIcon: React.FC<HealthItemIconProps> = ({ state, dataTest }) => (
  <div data-test={dataTest} className="co-dashboard-icon">
    {
      (healthStateMapping[state] || healthStateMapping[HealthState.UNKNOWN])
        .icon
    }
  </div>
);

// eslint-disable-next-line react/display-name
const HealthItem: React.FC<HealthItemProps> = React.memo(
  ({
    className,
    state,
    title,
    details,
    popupTitle,
    noIcon = false,
    icon,
    children,
    maxWidth,
    disableDetails = false,
  }) => {
    const { t } = useCustomTranslation();

    const detailMessage = !disableDetails
      ? details || healthStateMessage(state, t)
      : '';

    return (
      <div
        className={classNames('co-status-card__health-item', className)}
        data-item-id={`${title}-health-item`}
      >
        {state === HealthState.LOADING ? (
          <div className="skeleton-health">
            <span className="pf-u-screen-reader">
              {t('Loading {{title}} status', { title })}
            </span>
          </div>
        ) : (
          !noIcon &&
          (icon || (
            <HealthItemIcon
              state={state}
              dataTest={`${title}-health-item-icon`}
            />
          ))
        )}
        <div>
          <span className="co-status-card__health-item-text">
            {React.Children.toArray(children).length &&
            state !== HealthState.LOADING ? (
              <Popover
                position={PopoverPosition.top}
                headerContent={popupTitle}
                bodyContent={children}
                enableFlip
                maxWidth={maxWidth || '21rem'}
              >
                <Button
                  variant="link"
                  isInline
                  className="co-status-card__popup"
                  data-test="health-popover-link"
                >
                  {title}
                </Button>
              </Popover>
            ) : (
              title
            )}
          </span>
          {state !== HealthState.LOADING && detailMessage && (
            <SecondaryStatus
              status={detailMessage}
              className="co-status-card__health-item-text"
              dataStatusID={`${title}-secondary-status`}
            />
          )}
        </div>
      </div>
    );
  }
);

export default HealthItem;

type HealthItemIconProps = {
  state?: HealthState;
  dataTest?: string;
};
