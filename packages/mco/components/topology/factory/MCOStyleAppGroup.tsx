import * as React from 'react';
import classNames from 'classnames';
import {
  DefaultGroup,
  Node,
  observer,
  WithContextMenuProps,
  WithDragNodeProps,
  WithSelectionProps,
} from '@patternfly/react-topology';
import './MCOStyleAppGroup.scss';

type MCOStyleAppGroupProps = {
  element: Node;
} & Partial<WithContextMenuProps & WithDragNodeProps & WithSelectionProps>;

const MCOStyleAppGroup: React.FunctionComponent<MCOStyleAppGroupProps> = ({
  element,
  ...rest
}) => {
  const data = element.getData();

  const classes = classNames('mco-topology__app-group', {
    'mco-topology__app-group--cluster': data.isClusterGroup,
    'mco-topology__app-group--single': data.isSingleApp,
    'mco-topology__app-group--stacked':
      !data.isSingleApp && !data.isClusterGroup,
  });

  // For cluster groups, pass badge props to DefaultGroup
  // Note: We manually render decorators, so don't pass showStatusDecorator
  const groupProps = data.isClusterGroup
    ? {
        badge: data.badge,
        badgeColor: data.badgeColor,
        badgeTextColor: data.badgeTextColor,
        badgeBorderColor: data.badgeBorderColor,
        badgeClassName: data.badgeClassName,
      }
    : {};

  return (
    <g>
      <DefaultGroup
        className={classes}
        element={element}
        collapsible={false}
        showLabel={true} // Show cluster group label at the bottom
        hulledOutline={false}
        {...groupProps}
        {...rest}
      />
    </g>
  );
};

export default observer(MCOStyleAppGroup);
