import * as React from 'react';
import { NodeModel } from '@odf/shared/models';
import { getName, getUID } from '@odf/shared/selectors';
import { TopologyDataContext } from '@odf/shared/topology';
import { ResourceIcon } from '@openshift-console/dynamic-plugin-sdk';
import {
  Button,
  ButtonVariant,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
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
    [controller, updateCurrentNode]
  );

  const menuItems = React.useMemo(
    () =>
      nodes.map((node) => {
        const uid = getUID(node);
        const name = getName(node);
        return (
          <SelectOption isSelected={selected === name} key={uid} id={name}>
            <ResourceIcon
              groupVersionKind={{
                group: NodeModel.apiGroup,
                version: NodeModel.apiVersion,
                kind: NodeModel.kind,
              }}
            />
            {name}
          </SelectOption>
        );
      }),
    [nodes, selected]
  );

  const onStorageClusterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    controller.fireEvent(STEP_TO_CLUSTER);
  };

  const onToggleClick = () => {
    setOpen(!isOpen);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
      {selected}
    </MenuToggle>
  );

  return (
    <TopologyNavigationBarGroup>
      <TopologyNavigationItem>
        <Button
          variant={ButtonVariant.link}
          isInline
          className="odf-topology-nav__item-storage-cluster-link"
          onClick={onStorageClusterClick}
        >
          StorageCluster
        </Button>
      </TopologyNavigationItem>
      <TopologyNavigationItem>
        <ResourceIcon
          groupVersionKind={{
            group: NodeModel.apiGroup,
            version: NodeModel.apiVersion,
            kind: NodeModel.kind,
          }}
        />
        <Select
          id="node-menu"
          isOpen={isOpen}
          onOpenChange={(newOpenState) => setOpen(newOpenState)}
          onSelect={onSelect}
          selected={selected}
          toggle={toggle}
          shouldFocusToggleOnSelect
        >
          <SelectList>{menuItems}</SelectList>
        </Select>
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
