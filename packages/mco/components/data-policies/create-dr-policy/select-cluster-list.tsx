import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataList,
  DataListItem,
  DataListItemRow,
  DataListCheck,
  DataListItemCells,
  DataListCell,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Select,
  SelectOption,
  SearchInput,
  DataListCheckProps,
  TextContent,
  TextVariants,
  Text,
  Bullseye,
} from '@patternfly/react-core';
import './select-cluster-list.scss';
import { MAX_ALLOWED_CLUSTERS } from '../../../constants/dr-policy';

export type Cluster = {
  name: string;
  region: string;
  zone?: string;
};

const getFilteredClusters = (
  clusters: Cluster[],
  region: string,
  name: string,
  zone: string
) => {
  let filteredClusters = clusters;

  if (region)
    filteredClusters = filteredClusters.filter((c) => c.region === region);
  if (zone) filteredClusters = filteredClusters.filter((c) => c.zone === zone);
  if (name)
    filteredClusters = filteredClusters.filter((c) => c.name.includes(name));
  return filteredClusters;
};

export const SelectClusterList: React.FC<SelectClusterListProps> = ({
  selectedClusters,
  setSelectedClusters,
}) => {
  const { t } = useTranslation('plugin__odf-console');
  const [isRegionOpen, setIsRegionOpen] = React.useState(false);
  const [isZoneOpen, setIsZoneOpen] = React.useState(false);
  const [region, setRegion] = React.useState('');
  const [zone, setZone] = React.useState('');
  const [nameSearch, setNameSearch] = React.useState('');
  const [clusters] = React.useState<Cluster[]>([]);

  const onSelect: DataListCheckProps['onChange'] = (checked, event) => {
    if (checked)
      setSelectedClusters([
        ...selectedClusters,
        {
          name: event.currentTarget.value,
          region: event.currentTarget['data-region'],
        },
      ]);
    else {
      const newClusters = selectedClusters.filter(
        (c: Cluster) => c.name !== event.currentTarget.value
      );
      setSelectedClusters(newClusters);
    }
  };

  const filteredClusters: Cluster[] = React.useMemo(
    () => getFilteredClusters(clusters, region, nameSearch, zone),
    [clusters, region, nameSearch, zone]
  );

  return (
    <div className="mco-select-cluster-list">
      <Toolbar isSticky>
        <ToolbarContent>
          <ToolbarItem className="mco-select-cluster-list__filter-toolbar-item">
            <Select
              isOpen={isRegionOpen}
              onToggle={(open) => {
                setIsRegionOpen(open);
              }}
              onSelect={(_, selection, isPlaceholder) => {
                setRegion(isPlaceholder ? '' : (selection as string));
                setIsRegionOpen(false);
              }}
              selections={region}
            >
              <SelectOption value={t('Region')} isPlaceholder />
              <SelectOption value="us-east-1" />
            </Select>
          </ToolbarItem>
          <ToolbarItem className="mco-select-cluster-list__filter-toolbar-item">
            <Select
              isOpen={isZoneOpen}
              onToggle={(open) => {
                setIsZoneOpen(open);
              }}
              onSelect={(_, selection, isPlaceholder) => {
                setZone(isPlaceholder ? '' : (selection as string));
                setIsZoneOpen(false);
              }}
              selections={zone}
            >
              <SelectOption value={t('Zone')} isPlaceholder />
              <SelectOption value="us-east-1a" />
            </Select>
          </ToolbarItem>
          <ToolbarItem className="mco-select-cluster-list__search-toolbar-item">
            <SearchInput
              placeholder={t('Cluster name')}
              onChange={(val) => setNameSearch(val)}
              value={nameSearch}
              onClear={(e) => setNameSearch('')}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      {filteredClusters.length === 0 ? (
        <Bullseye className="mco-select-cluster-list__bullseye">
          {t('No clusters found')}
        </Bullseye>
      ) : (
        <DataList
          aria-label={t('Select cluster list')}
          isCompact
          className="mco-select-cluster-list__data-list"
        >
          {filteredClusters.map((fc) => (
            <DataListItem key="">
              <DataListItemRow>
                <DataListCheck
                  aria-labelledby={t('Checkbox to select cluster')}
                  onChange={onSelect}
                  value={fc.name}
                  data-region={fc.region}
                  isChecked={selectedClusters.some((sc) => sc.name === fc.name)}
                  isDisabled={
                    selectedClusters.length === MAX_ALLOWED_CLUSTERS &&
                    !selectedClusters.some((sc) => sc.name === fc.name)
                  }
                />
                <DataListItemCells
                  dataListCells={[
                    <DataListCell key={fc.name}>
                      <TextContent>
                        <Text component={TextVariants.p}>{fc.name}</Text>
                        <Text component={TextVariants.small}>{fc.region}</Text>
                      </TextContent>
                    </DataListCell>,
                  ]}
                />
              </DataListItemRow>
            </DataListItem>
          ))}
        </DataList>
      )}
    </div>
  );
};

type SelectClusterListProps = {
  selectedClusters: Cluster[];
  setSelectedClusters: React.Dispatch<React.SetStateAction<Cluster[]>>;
};
