import * as React from 'react';
import { global_danger_color_100 as dangerColor } from '@patternfly/react-tokens/dist/js/global_danger_color_100';
import { global_disabled_color_100 as disabledColor } from '@patternfly/react-tokens/dist/js/global_disabled_color_100';
import { global_info_color_100 as blueDefaultColor } from '@patternfly/react-tokens/dist/js/global_info_color_100';
import { global_palette_black_600 as GrayInfoColor } from '@patternfly/react-tokens/dist/js/global_palette_black_600';
import { global_palette_blue_300 as blueInfoColor } from '@patternfly/react-tokens/dist/js/global_palette_blue_300';
import { global_palette_green_500 as okColor } from '@patternfly/react-tokens/dist/js/global_palette_green_500';
import { global_warning_color_100 as warningColor } from '@patternfly/react-tokens/dist/js/global_warning_color_100';
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
} from '@patternfly/react-icons';

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
    color={GrayInfoColor.value}
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
