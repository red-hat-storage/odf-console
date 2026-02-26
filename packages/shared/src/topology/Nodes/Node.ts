import * as React from 'react';
import {
  BadgeLocation,
  LabelPosition,
  NodeModel,
  NodeShape,
  NodeStatus,
} from '@patternfly/react-topology';

export enum DataTypes {
  Default,
  Alternate,
}

export const DEFAULT_NODE_SIZE = 75;
export const ROW_HEIGHT = 140;
export const BOTTOM_LABEL_ROW_HEIGHT = 165;
export const COLUMN_WIDTH = 100;
export const RIGHT_LABEL_COLUMN_WIDTH = 200;

export const createNode = (options: {
  id: string;
  type?: string;
  label?: string;
  secondaryLabel?: string;
  labelPosition?: LabelPosition;
  badge?: string;
  badgeColor?: string;
  badgeTextColor?: string;
  badgeBorderColor?: string;
  badgeClassName?: string;
  badgeLocation?: BadgeLocation;
  row?: number;
  column?: number;
  width?: number;
  height?: number;
  shape?: NodeShape;
  status?: NodeStatus;
  showStatusDecorator?: boolean;
  statusDecoratorTooltip?: React.ReactNode;
  showDecorators?: boolean;
  selected?: boolean;
  hover?: boolean;
  x?: number;
  y?: number;
  showContextMenu?: boolean;
  labelIconClass?: string;
  marginX?: number;
  truncateLength?: number;
  setLocation?: boolean;
  dataType?: DataTypes;
  resource?: any;
  kind?: any;
  osdCount?: number;
}): NodeModel => {
  const shape = options.shape || NodeShape.ellipse;
  const width = options.width || DEFAULT_NODE_SIZE;
  let height = options.height;
  if (!height) {
    height = DEFAULT_NODE_SIZE;
    if (shape === NodeShape.trapezoid) {
      height *= 0.75;
    } else if (shape === NodeShape.stadium) {
      height *= 0.5;
    }
  }

  const nodeModel: NodeModel = {
    id: options.id,
    type: options.type || 'node',
    label: options.label,
    width,
    height,
    shape,
    status: options.status || NodeStatus.default,
    labelPosition: options.labelPosition,
    style: { padding: 30 },
    // data items are used to pass to the component to show various option, demo purposes only
    data: {
      dataType: 'Default',
      ...options,
      resource: options.resource,
      kind: options.kind,
      canStepInto: true,
    },
  };
  return nodeModel;
};
