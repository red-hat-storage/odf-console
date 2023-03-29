import * as React from 'react';
import { NodeModel } from '@odf/shared/models';
import { getName, getUID } from '@odf/shared/selectors';
import { TopologyDataContext } from '@odf/shared/topology';
import { ResourceIcon } from '@openshift-console/dynamic-plugin-sdk';
import {
  OptionsMenu,
  OptionsMenuItem,
  OptionsMenuToggle,
} from '@patternfly/react-core';
import { AngleRightIcon } from '@patternfly/react-icons';
import { useVisualizationController } from '@patternfly/react-topology';
import { STEP_INTO_EVENT, STEP_TO_CLUSTER } from '../constants';
import './TopologyNavigation.scss';

const TopologyNavigationItem: React.FC = ({ children }) => {
  return <div className="odf-topology-nav__item">{children}</div>;
};

type TopologyNavigationBarProps = {
  initialNode: string;
  updateCurrentNode: (node: string) => void;
};

const TopologyNavigationBar: React.FC<TopologyNavigationBarProps> = ({
  initialNode,
  updateCurrentNode,
}) => {
  const [isOpen, setOpen] = React.useState<boolean>(false);
  const [selected, setSelected] = React.useState<string>(initialNode);

  const { nodes } = React.useContext(TopologyDataContext);
  const controller = useVisualizationController();

  const onSelect = React.useCallback(
    (event) => {
      const id = event.currentTarget.id;
      setSelected(id);
      updateCurrentNode(id);
      controller.fireEvent(STEP_INTO_EVENT, { label: id });
    },
    [updateCurrentNode]
  );

  const menuItems = React.useMemo(
    () =>
      nodes.map((node) => {
        const uid = getUID(node);
        const name = getName(node);
        return (
          <OptionsMenuItem
            onSelect={onSelect}
            isSelected={selected === name}
            key={uid}
            id={name}
          >
            <ResourceIcon
              groupVersionKind={{
                group: NodeModel.apiGroup,
                version: NodeModel.apiVersion,
                kind: NodeModel.kind,
              }}
            />
            {name}
          </OptionsMenuItem>
        );
      }),
    [nodes, selected, onSelect]
  );

  const onToggle = () => setOpen((o) => !o);

  const toggle = React.useMemo(
    () => <OptionsMenuToggle onToggle={onToggle} toggleTemplate={selected} />,
    [selected]
  );

  const onStorageClusterClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    controller.fireEvent(STEP_TO_CLUSTER);
  };

  return (
    <TopologyNavigationBarGroup>
      <TopologyNavigationItem>
        <a onClick={onStorageClusterClick}>StorageCluster</a>
      </TopologyNavigationItem>
      <TopologyNavigationItem>
        <ResourceIcon
          groupVersionKind={{
            group: NodeModel.apiGroup,
            version: NodeModel.apiVersion,
            kind: NodeModel.kind,
          }}
        />
        <OptionsMenu
          id="node-menu"
          menuItems={menuItems}
          toggle={toggle}
          isOpen={isOpen}
        />
      </TopologyNavigationItem>
    </TopologyNavigationBarGroup>
  );
};

const TopologyNavigationBarGroup: React.FC = ({ children }) => {
  const childArray = React.Children.toArray(children);
  return (
    <div className="odf-topology-nav">
      {childArray.map((child, i) => {
        const isLast = i === childArray.length - 1;
        if (!isLast) {
          return (
            <>
              {child}
              <TopologyNavigationItem key={i}>
                <AngleRightIcon />
              </TopologyNavigationItem>
            </>
          );
        } else {
          return <>{child}</>;
        }
      })}
    </div>
  );
};

export default TopologyNavigationBar;
