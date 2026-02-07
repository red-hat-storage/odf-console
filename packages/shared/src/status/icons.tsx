import * as React from 'react';
import {
  CheckCircleIcon,
  InfoCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ArrowCircleUpIcon,
  UnknownIcon,
  SyncAltIcon,
  ResourcesAlmostFullIcon,
  ResourcesFullIcon,
  TimesIcon,
  TimesCircleIcon,
} from '@patternfly/react-icons';
import {
  t_global_icon_color_status_danger_default as dangerColor,
  t_global_icon_color_disabled as disabledColor,
  t_global_icon_color_brand_default as blueDefaultColor,
  t_global_icon_color_subtle as grayInfoColor,
  t_global_icon_color_status_info_default as blueInfoColor,
  t_global_icon_color_status_success_default as okColor,
  t_global_icon_color_status_warning_default as warningColor,
} from '@patternfly/react-tokens';

export type ColoredIconProps = {
  className?: string;
  title?: string;
};

export const GreenCheckCircleIcon: React.FC<ColoredIconProps> = ({
  className,
  title,
}) => (
  <CheckCircleIcon
    data-test="success-icon"
    color={okColor.value}
    className={className}
    title={title}
  />
);

export const RedExclamationCircleIcon: React.FC<ColoredIconProps> = ({
  className,
  title,
}) => (
  <ExclamationCircleIcon
    color={dangerColor.value}
    className={className}
    title={title}
  />
);

export const RedExclamationTriangleIcon: React.FC<ColoredIconProps> = ({
  className,
  title,
}) => (
  <ExclamationTriangleIcon
    color={dangerColor.value}
    className={className}
    title={title}
  />
);

export const YellowExclamationTriangleIcon: React.FC<ColoredIconProps> = ({
  className,
  title,
}) => (
  <ExclamationTriangleIcon
    color={warningColor.value}
    className={className}
    title={title}
  />
);

export const BlueInfoCircleIcon: React.FC<ColoredIconProps> = ({
  className,
  title,
}) => (
  <InfoCircleIcon
    color={blueInfoColor.value}
    className={className}
    title={title}
  />
);

export const GrayInfoCircleIcon: React.FC<ColoredIconProps> = ({
  className,
  title,
}) => (
  <InfoCircleIcon
    color={grayInfoColor.value}
    className={className}
    title={title}
  />
);

export const GrayUnknownIcon: React.FC<ColoredIconProps> = ({
  className,
  title,
}) => (
  <UnknownIcon
    color={disabledColor.value}
    className={className}
    title={title}
  />
);

export const BlueSyncIcon: React.FC<ColoredIconProps> = ({
  className,
  title,
}) => (
  <SyncAltIcon
    color={blueInfoColor.value}
    className={className}
    title={title}
  />
);

export const RedResourcesFullIcon: React.FC<ColoredIconProps> = ({
  className,
  title,
}) => (
  <ResourcesFullIcon
    color={dangerColor.value}
    className={className}
    title={title}
  />
);

export const YellowResourcesAlmostFullIcon: React.FC<ColoredIconProps> = ({
  className,
  title,
}) => (
  <ResourcesAlmostFullIcon
    color={warningColor.value}
    className={className}
    title={title}
  />
);

export const BlueArrowCircleUpIcon: React.FC<ColoredIconProps> = ({
  className,
  title,
}) => (
  <ArrowCircleUpIcon
    color={blueDefaultColor.value}
    className={className}
    title={title}
  />
);

export const RedTimesIcon: React.FC<ColoredIconProps> = ({
  className,
  title,
}) => (
  <TimesIcon color={dangerColor.value} className={className} title={title} />
);

export const RedTimesCircleIcon: React.FC<ColoredIconProps> = ({
  className,
  title,
}) => (
  <TimesCircleIcon
    color={dangerColor.value}
    className={className}
    title={title}
  />
);
