import * as React from 'react';
import {
  BlueInfoCircleIcon,
  GreenCheckCircleIcon,
  K8sResourceCommon,
  RedExclamationCircleIcon,
  useK8sModel,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import useDetailsLevel from '@patternfly/react-topology/dist/esm/hooks/useDetailsLevel';
import classNames from 'classnames';
import * as _ from 'lodash-es';
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
import { getGVKofResource } from '../../utils';
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

const getLabel = (
  alerts: MonitoringResponseInternals,
  resource: K8sResourceCommon
) => {
  const isCritical = alerts?.critical?.length > 0;
  const isWarning = alerts?.warning?.length > 0;
  const isInfo = alerts?.info?.length > 0;

  // Zones have no alerts
  if (!resource) {
    return null;
  }

  if (isCritical) {
    return <RedExclamationCircleIcon />;
  }
  if (isWarning) {
    return <YellowExclamationTriangleIcon />;
  }
  if (isInfo) {
    return <BlueInfoCircleIcon />;
  }
  return <GreenCheckCircleIcon />;
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

  const resource = data?.resource;
  const reference = resource ? getGVKofResource(resource) : '';
  const [model] = useK8sModel(reference);

  const badge = model?.abbr;

  const [alerts] = useMonitoring(component);

  const label = React.useMemo(
    () => getLabel(alerts, resource),
    [alerts, resource]
  );

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
      badge={badge}
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
