import type { ReactNode } from 'react';

export type StatusComponentProps = {
  children?: ReactNode;
  title?: string;
  iconOnly?: boolean;
  noTooltip?: boolean;
  className?: string;
  popoverTitle?: string;
};
