import * as React from 'react';
import useDetailsLevel from '@patternfly/react-topology/dist/esm/hooks/useDetailsLevel';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import {
  ErrorCircleOIcon,
  ExclamationCircleIcon,
  InfoCircleIcon,
} from '@patternfly/react-icons';
import {
  DefaultGroup,
  Node,
  observer,
  ScaleDetailsLevel,
  ShapeProps,
  WithContextMenuProps,
  WithDragNodeProps,
  WithSelectionProps,
} from '@patternfly/react-topology';
import useMonitoring, {
  AlertFiringComponent,
  MonitoringResponseInternals,
} from '../utils/Monitoring';
import './StyleGroup.scss';

type StyleGroupProps = {
  element: Node;
  collapsible?: boolean;
  collapsedWidth?: number;
  collapsedHeight?: number;
  onCollapseChange?: (group: Node, collapsed: boolean) => void;
  getCollapsedShape?: (node: Node) => React.FunctionComponent<ShapeProps>;
  collapsedShadowOffset?: number; // defaults to 10
} & Partial<WithContextMenuProps & WithDragNodeProps & WithSelectionProps>;

const getLabel = (alerts: MonitoringResponseInternals) => {
  const isCritical = alerts?.critical?.length > 0;
  const isWarning = alerts?.warning?.length > 0;
  const isInfo = alerts?.info?.length > 0;

  if (isCritical) {
    return <ErrorCircleOIcon />;
  }
  if (isWarning) {
    return <ExclamationCircleIcon />;
  }
  if (isInfo) {
    return <InfoCircleIcon />;
  }
  return null;
};

const StyleGroup: React.FunctionComponent<StyleGroupProps> = ({
  element,
  onContextMenu,
  contextMenuOpen,
  ...rest
}) => {
  const data = element.getData();
  const detailsLevel = useDetailsLevel();

  const component = data.component as AlertFiringComponent;

  const [alerts] = useMonitoring(component);

  const label = React.useMemo(() => getLabel(alerts), [alerts]);

  const classes = React.useMemo(
    () =>
      classNames('odf-topology__group', {
        'odf-topology__group--zone': _.has(data, 'zone'),
        'odf-topology__group-state--warning': alerts?.warning?.length > 0,
        'odf-topology__group-state--error': alerts?.critical?.length > 0,
      }),
    [alerts?.critical?.length, alerts?.warning?.length, data]
  );

  const passedData = React.useMemo(() => {
    const newData = { ...data };
    Object.keys(newData).forEach((key) => {
      if (newData[key] === undefined) {
        delete newData[key];
      }
    });
    return newData;
  }, [data]);

  return (
    <DefaultGroup
      className={classes}
      labelIcon={label}
      onContextMenu={data.showContextMenu ? onContextMenu : undefined}
      contextMenuOpen={contextMenuOpen}
      element={element}
      collapsible={false}
      showLabel={detailsLevel === ScaleDetailsLevel.high}
      {...rest}
      {...passedData}
    />
  );
};

export default observer(StyleGroup);
