import * as React from 'react';
import {
  BlueInfoCircleIcon,
  GreenCheckCircleIcon,
  K8sModel,
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
  NodeStatus,
  observer,
  ScaleDetailsLevel,
  ShapeProps,
  WithContextMenuProps,
  WithDragNodeProps,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { DeploymentModel, NodeModel } from '../../models';
import { getName } from '../../selectors';
import { getGVKofResource } from '../../utils';
import { TopologyDataContext } from '../Context';
import { getStatus } from '../utils';
import useMonitoring, { AlertFiringComponent } from '../utils/Monitoring';
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

const deriveLabelFromStatus = (status: NodeStatus) => {
  if (status === NodeStatus.danger) {
    return <RedExclamationCircleIcon />;
  }

  if (status === NodeStatus.warning) {
    return <YellowExclamationTriangleIcon />;
  }

  if (status === NodeStatus.info) {
    return <BlueInfoCircleIcon />;
  }

  if (status === NodeStatus.success) {
    return <GreenCheckCircleIcon />;
  }
};

const modelFactory = (model: K8sModel) => {
  if (model.kind === 'Node') {
    return NodeModel;
  }
  if (model.kind === 'Deployment') {
    return DeploymentModel;
  }
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

  const { nodeDeploymentMap } = React.useContext(TopologyDataContext);

  const resource = data?.resource;
  const reference = resource ? getGVKofResource(resource) : '';
  const [model] = useK8sModel(reference);

  const badge = model?.abbr;

  const [alerts, loaded, error] = useMonitoring(component, getName(resource));

  const status: NodeStatus = React.useMemo(() => {
    if (!resource || !loaded || error) {
      return null;
    }
    return getStatus(modelFactory(model), nodeDeploymentMap, resource, alerts);
  }, [alerts, model, nodeDeploymentMap, resource, loaded, error]);

  const label = React.useMemo(() => {
    if (!resource) {
      return null;
    }
    return deriveLabelFromStatus(status);
  }, [resource, status]);

  const classes = React.useMemo(
    () =>
      classNames('odf-topology__group', {
        'odf-topology__group--zone': _.has(data, 'zone'),
        'odf-topology__group-state--warning': NodeStatus.warning === status,
        'odf-topology__group-state--error': NodeStatus.danger === status,
      }),
    [data, status]
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
