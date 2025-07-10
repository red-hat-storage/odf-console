import * as React from 'react';
import {
  TreeView,
  TreeViewDataItem,
  TreeViewProps,
} from '@patternfly/react-core';

type CheckboxTreeProps = {
  checkedItems: Set<string>;
  setCheckedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  options: TreeViewDataItem[];
  treeViewProps?: Omit<TreeViewProps, 'data' | 'onCheck' | 'hasCheckboxes'>;
};

const filterItems = (item: TreeViewDataItem, checkedItem: TreeViewDataItem) => {
  if (item.id === checkedItem.id) {
    return true;
  }

  if (item.children) {
    return (
      (item.children = item.children
        .map((opt) => Object.assign({}, opt))
        .filter((child) => filterItems(child, checkedItem))).length > 0
    );
  }
};

const flattenTreeIds = (tree: TreeViewDataItem[]): Set<string> => {
  const result = new Set<string>();

  const traverse = (nodes: TreeViewDataItem[]) => {
    for (const item of nodes) {
      result.add(item.id);
      if (item.children) {
        traverse(item.children);
      }
    }
  };

  traverse(tree);
  return result;
};

export const CheckboxTree: React.FC<CheckboxTreeProps> = ({
  checkedItems,
  setCheckedItems,
  options,
  treeViewProps,
}) => {
  const onCheck = (
    event: React.ChangeEvent,
    treeViewItem: TreeViewDataItem
  ) => {
    const checked = (event.target as HTMLInputElement).checked;

    const checkedItemTree = options
      .map((opt) => Object.assign({}, opt))
      .filter((item) => filterItems(item, treeViewItem));
    const flatCheckedItems = flattenTreeIds(checkedItemTree);

    setCheckedItems((prevCheckedItems) =>
      checked
        ? new Set([...prevCheckedItems, ...flatCheckedItems])
        : new Set(
            [...prevCheckedItems].filter((id) => !flatCheckedItems.has(id))
          )
    );
  };

  const isChecked = (dataItem: TreeViewDataItem) =>
    checkedItems.has(dataItem.id);
  const areAllDescendantsChecked = (dataItem: TreeViewDataItem) =>
    dataItem.children
      ? dataItem.children.every((child) => areAllDescendantsChecked(child))
      : isChecked(dataItem);
  const areSomeDescendantsChecked = (dataItem: TreeViewDataItem) =>
    dataItem.children
      ? dataItem.children.some((child) => areSomeDescendantsChecked(child))
      : isChecked(dataItem);

  const mapTree = (item: TreeViewDataItem) => {
    const hasCheck = areAllDescendantsChecked(item);

    if (item.checkProps) {
      item.checkProps.checked = false;

      if (hasCheck) {
        item.checkProps.checked = true;
      } else {
        const hasPartialCheck = areSomeDescendantsChecked(item);
        if (hasPartialCheck) {
          item.checkProps.checked = null;
        }
      }

      if (item.children) {
        return {
          ...item,
          children: item.children.map((child) => mapTree(child)),
        };
      }
    }
    return item;
  };

  const mapped: TreeViewDataItem[] = options.map((item) => mapTree(item));
  return (
    <TreeView
      data={mapped}
      onCheck={onCheck}
      hasCheckboxes
      {...(treeViewProps ?? {})}
    />
  );
};
