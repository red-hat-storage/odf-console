import * as React from 'react';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  TreeView,
  TreeViewDataItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Text,
  TextVariants,
  TextContent,
  SearchInput,
  Bullseye,
} from '@patternfly/react-core';
import { AppToPlacementType } from '../../../../types';
import './application-selector.scss';

type TreeViewDataItemMap = {
  checkedItems: TreeViewDataItem[];
};

type BadgeProps = {
  subNames: string[];
  plsRule: string;
};

type ApplicationSelectorProps = {
  applicationToPlacementMap: AppToPlacementType;
  selectedNames: TreeViewDataItemMap;
  setSelectedNames: React.Dispatch<React.SetStateAction<TreeViewDataItemMap>>;
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

const flattenTree = (tree: TreeViewDataItem[]) => {
  let result: TreeViewDataItem[] = [];
  tree.forEach((item) => {
    result.push(item);
    if (item.children) {
      result = result.concat(flattenTree(item.children));
    }
  });
  return result;
};

// Helper functions
const isChecked = (
  dataItem: TreeViewDataItem,
  selectedNames: TreeViewDataItemMap
) => selectedNames.checkedItems.some((item) => item.id === dataItem.id);

const areAllDescendantsChecked = (
  dataItem: TreeViewDataItem,
  selectedNames: TreeViewDataItemMap
) =>
  dataItem.children
    ? dataItem.children.every((child) =>
        areAllDescendantsChecked(child, selectedNames)
      )
    : isChecked(dataItem, selectedNames);

const areSomeDescendantsChecked = (
  dataItem: TreeViewDataItem,
  selectedNames: TreeViewDataItemMap
) =>
  dataItem.children
    ? dataItem.children.some((child) =>
        areSomeDescendantsChecked(child, selectedNames)
      )
    : isChecked(dataItem, selectedNames);

const mapTree = (
  item: TreeViewDataItem,
  selectedNames: TreeViewDataItemMap
) => {
  // Reset checked properties to be updated
  item.checkProps.checked = false;
  const hasCheck = areAllDescendantsChecked(item, selectedNames);
  const hasPartialCheck = areSomeDescendantsChecked(item, selectedNames);
  if (hasCheck) {
    item.checkProps.checked = true;
  } else if (hasPartialCheck) {
    item.checkProps.checked = null;
  }
  if (item.children) {
    return {
      ...item,
      children: item.children.map((child) => mapTree(child, selectedNames)),
    };
  }
  return item;
};

const Badge: React.FC<BadgeProps> = (props) => {
  const { subNames, plsRule } = props;

  return (
    <>
      {subNames.slice(0, subNames.length).map((subName) => (
        <p key={subName}>{subName}</p>
      ))}
      <TextContent>
        <Text component={TextVariants.small}>{plsRule}</Text>
      </TextContent>
    </>
  );
};

const filterOptions = (option: TreeViewDataItem, searchValue: string) =>
  option?.name?.toString()?.toLowerCase()?.includes(searchValue.toLowerCase());

export const ApplicationSelector: React.FC<ApplicationSelectorProps> = (
  props
) => {
  const { applicationToPlacementMap, selectedNames, setSelectedNames } = props;

  const { t } = useCustomTranslation();
  const [options, setOptions] = React.useState<TreeViewDataItem[]>([]);
  const [filteredOptions, setFilteredOptions] = React.useState<
    TreeViewDataItem[]
  >([]);
  const [searchAppName, setSearchAppName] = React.useState('');

  React.useEffect(() => {
    const tempItem: TreeViewDataItem[] = [];
    Object.keys(applicationToPlacementMap).forEach((appUniqueName) => {
      const childerns: TreeViewDataItem[] = [];
      Object.keys(applicationToPlacementMap[appUniqueName]?.placements).forEach(
        (placementUniqueName) => {
          const placementName =
            applicationToPlacementMap[appUniqueName].placements[
              placementUniqueName
            ];
          const { subscriptions, placement } = placementName || {};
          const subNames = subscriptions?.map(getName);
          childerns.push({
            name: (
              <Badge
                subNames={subNames}
                plsRule={getName(placement)}
                key={getName(placement)}
              />
            ),
            id: `${appUniqueName}:${placementUniqueName}`,
            checkProps: { checked: false },
          });
        }
      );
      tempItem.push({
        name: getName(applicationToPlacementMap?.[appUniqueName]?.application),
        id: appUniqueName,
        checkProps: { checked: false },
        children: childerns,
        customBadgeContent: ' ',
      });
      setOptions(tempItem);
    });
  }, [applicationToPlacementMap]);

  React.useEffect(() => {
    searchAppName === '' && setFilteredOptions(options);
  }, [options, searchAppName]);

  const getCheckedItems = React.useCallback(
    (treeViewItem) =>
      filteredOptions
        .map((opt) => Object.assign({}, opt))
        .filter((item) => filterItems(item, treeViewItem)),
    [filteredOptions]
  );

  const onCheck = (evt, treeViewItem) => {
    const checked = evt.target.checked;
    const checkedItemTree = getCheckedItems(treeViewItem);
    const flatCheckedItems = flattenTree(checkedItemTree);
    setSelectedNames((prevState) => ({
      checkedItems: checked
        ? prevState.checkedItems.concat(
            flatCheckedItems.filter(
              (item) => !prevState.checkedItems.some((i) => i.id === item.id)
            )
          )
        : prevState.checkedItems.filter(
            (item) => !flatCheckedItems.some((i) => i.id === item.id)
          ),
    }));
  };

  // **Note: PatternFly change the fn signature
  // From: (value: string, event: React.FormEvent<HTMLInputElement>) => void
  // To: (_event: React.FormEvent<HTMLInputElement>, value: string) => void
  // both cases need to be handled for backwards compatibility
  const onSearch = (input: any) => {
    const searchValue =
      typeof input === 'string'
        ? input
        : (input.target as HTMLInputElement)?.value;
    setSearchAppName(searchValue);
    if (searchValue !== '') {
      setFilteredOptions(
        options?.filter((option) => filterOptions(option, searchValue)) ?? []
      );
    }
  };

  const mapped = filteredOptions?.map((item) => mapTree(item, selectedNames));

  return (
    <div className="mco-subs-application-selector__box">
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              data-test="app-search-input"
              placeholder={t('Application search')}
              type="text"
              aria-label={t('application name search')}
              value={searchAppName}
              onChange={onSearch}
              onClear={() => setSearchAppName('')}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      {Object.keys(filteredOptions)?.length === 0 ? (
        <Bullseye
          data-test="no-app-bullseye"
          className="mco-subs-application-selector__bullseye"
        >
          {t('No matching application found')}
        </Bullseye>
      ) : (
        <TreeView
          id="app-tree-view"
          data={mapped}
          onCheck={onCheck}
          hasChecks
          className="mco-subs-application-selector__checkboxtree"
        />
      )}
    </div>
  );
};
