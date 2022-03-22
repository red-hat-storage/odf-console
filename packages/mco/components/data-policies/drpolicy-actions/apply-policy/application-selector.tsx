import  * as React from 'react';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';
import { useTranslation } from 'react-i18next';
import { TextInput, Button, ButtonVariant, InputGroup, Toolbar, ToolbarContent,  ToolbarItem, Bullseye} from '@patternfly/react-core';
import { TableComposable, Tr, Tbody, Td } from '@patternfly/react-table';
import './application-selector.scss';


const reactPropFix = {
    translate: 'no',
};

export const ApplicationSelector: React.FC<ApplicationSelectorProps> = (props) => {
  const { t } = useTranslation('plugin__odf-console');
  
  const {applicationToPlacementRuleMap, selectedNames, setSelectedNames} = props;
  const [filteredNames, setFilteredNames] = React.useState<string[]>([]);

  React.useEffect(() => {
    setFilteredNames(Object.keys(applicationToPlacementRuleMap));
  },[applicationToPlacementRuleMap]);

  const filterItems = (name: string, searchValue: string) => {
    if (name.toLowerCase().includes(searchValue.toLowerCase())) {
      return true;
    }
  };

  const onSearch = (searchValue: string) => {
    if (searchValue === '') {
      setFilteredNames(Object.keys(applicationToPlacementRuleMap));
    } else {
      setFilteredNames(Object.keys(applicationToPlacementRuleMap).filter(name => filterItems(applicationToPlacementRuleMap?.[name].applicationName, searchValue)));
    }
  };

  const isRepoSelectable = (name: string) => !applicationToPlacementRuleMap?.[name].disable;

  const setRepoSelected = (name: string, isSelecting = true) =>
    setSelectedNames(prevSelected => {
      const otherSelectedRepoNames = prevSelected.filter(r => r !== name);
      return isSelecting && isRepoSelectable(name) ? [...otherSelectedRepoNames, name] : otherSelectedRepoNames;
    });

  const isRepoSelected = (name: string) => selectedNames.includes(name);

  // To allow shift+click to select/deselect multiple rows
  const [recentSelectedRowIndex, setRecentSelectedRowIndex] = React.useState<number | null>(null);
  const [shifting, setShifting] = React.useState(false);

  const onSelectRepo = (name: string, rowIndex: number, isSelecting: boolean) => {
    // If the user is shift + selecting the checkboxes, then all intermediate checkboxes should be selected
    if (shifting && recentSelectedRowIndex !== null) {
      const numberSelected = rowIndex - recentSelectedRowIndex;
      const intermediateIndexes =
        numberSelected > 0
          ? Array.from(new Array(numberSelected + 1), (_x, i) => i + recentSelectedRowIndex)
          : Array.from(new Array(Math.abs(numberSelected) + 1), (_x, i) => i + rowIndex);
      intermediateIndexes.forEach(index => setRepoSelected(filteredNames[index], isSelecting));
    } else {
      setRepoSelected(name, isSelecting);
    }
    setRecentSelectedRowIndex(rowIndex);
  };

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShifting(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShifting(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  return (
    <div className="mco-application-selector__box">
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <InputGroup>
              <TextInput placeholder={t("Application name")} name="appNameText" id="appNameText" type="search" aria-label={t("application name search")} onChange={onSearch}/>
              <Button variant={ButtonVariant.control} aria-label={t("application name search button")}>
                <SearchIcon />
              </Button>
            </InputGroup>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      {filteredNames.length === 0 ? (
        <Bullseye className="mco-application-selector__bullseye">
          {t('No matching application found')}
        </Bullseye>
      ) : (
        <div className="mco-application-selector__table">
        <TableComposable 
          {...reactPropFix}
          variant="compact"
          aria-label={t("App selectable table")}
          borders={false}
          gridBreakPoint=''
          isStickyHeader
        >
            <Tbody {...reactPropFix}>
              {filteredNames.map((name, rowIndex) => (
                <Tr {...reactPropFix} key={name}>
                  <Td
                    {...reactPropFix}
                    select={{
                      rowIndex,
                      onSelect: (_event, isSelecting) => onSelectRepo(name, rowIndex, isSelecting),
                      isSelected: isRepoSelected(name),
                      disable: !isRepoSelectable(name)
                    }}
                  />
                  <Td {...reactPropFix}>{applicationToPlacementRuleMap?.[name].applicationName}</Td>
                </Tr>
              ))}
            </Tbody>
        </TableComposable>
        </div>
      )}
    </div>
  );
};


export type ApplicationToPlacementRuleMap = {
  [key in string] : {
    applicationName: string;
    placementRule: string;
    subscriptions: string[];
    namespace: string;
    disable: boolean;
  };
};

type ApplicationSelectorProps =  {
  applicationToPlacementRuleMap: ApplicationToPlacementRuleMap;
  selectedNames: string[];
  setSelectedNames: React.Dispatch<React.SetStateAction<string[]>>;
}
