import * as React from 'react';
import {
  Node,
  observer,
  DefaultGroup,
  WithSelectionProps,
  WithDragNodeProps,
  WithContextMenuProps,
} from '@patternfly/react-topology';
import './MCOPairingBox.scss';

type MCOPairingBoxProps = {
  element: Node;
} & Partial<WithSelectionProps & WithDragNodeProps & WithContextMenuProps>;

/**
 * Component that renders a dotted bounding box around two paired clusters
 * Uses DefaultGroup to let the layout manager handle positioning
 */
const MCOPairingBoxComponent: React.FC<MCOPairingBoxProps> = ({
  element,
  ...rest
}) => {
  const data = element.getData();

  if (!data) {
    return null;
  }

  const { badge, badgeColor, badgeTextColor, badgeBorderColor } = data;

  // Use DefaultGroup to automatically handle bounds from children
  return (
    <DefaultGroup
      className="mco-pairing-box"
      element={element}
      collapsible={false}
      showLabel={true}
      hulledOutline={false} // Don't use convex hull, use rect
      badge={badge}
      badgeColor={badgeColor}
      badgeTextColor={badgeTextColor}
      badgeBorderColor={badgeBorderColor}
      {...rest}
    />
  );
};

export const MCOPairingBox = observer(MCOPairingBoxComponent);
