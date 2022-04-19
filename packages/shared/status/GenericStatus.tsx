import * as React from 'react';
import PopoverStatus from './PopoverStatus';
import StatusIconAndText from './StatusIconAndText';
import { StatusComponentProps } from './types';

type GenericStatusProps = StatusComponentProps & {
  Icon: React.ComponentType<{ title?: string }>;
  popoverTitle?: string;
  noTooltip?: boolean;
};

const GenericStatus: React.FC<GenericStatusProps> = (props) => {
  const {
    Icon,
    children,
    popoverTitle,
    title,
    noTooltip,
    iconOnly,
    ...restProps
  } = props;
  const renderIcon = iconOnly && !noTooltip ? <Icon title={title} /> : <Icon />;
  const statusBody = (
    <StatusIconAndText
      {...restProps}
      noTooltip={noTooltip}
      title={title}
      iconOnly={iconOnly}
      icon={renderIcon}
    />
  );
  return React.Children.toArray(children).length ? (
    <PopoverStatus
      title={popoverTitle || title}
      {...restProps}
      statusBody={statusBody}
    >
      {children}
    </PopoverStatus>
  ) : (
    statusBody
  );
};

export default GenericStatus;
