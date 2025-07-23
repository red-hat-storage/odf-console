import * as React from 'react';
import { useMemo, useState, useCallback } from 'react';
import { useACMSafeFetch } from '@odf/mco/hooks';
import { queryStorageClassesUsingClusterNames } from '@odf/mco/utils';
import {
  Alert,
  AlertVariant,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  Spinner,
} from '@patternfly/react-core';
import { StorageClassEntry } from '../utils/reducer';

type CommonStorageClassDropdownProps = {
  selectedClusters: string[];
  onSelect?: (entry: StorageClassEntry) => void;
};

export const CommonStorageClassDropdown: React.FC<
  CommonStorageClassDropdownProps
> = ({ selectedClusters, onSelect }) => {
  const searchQuery = useMemo(
    () => queryStorageClassesUsingClusterNames(selectedClusters),
    [selectedClusters]
  );
  const [result, error, loaded] = useACMSafeFetch(searchQuery);

  const parsedArrays = useMemo<StorageClassEntry[][]>(() => {
    if (!loaded) return [];
    const maps: any[] = result?.data?.searchResult ?? [];
    return maps.map((m) =>
      (m.items || []).map((i: any) => ({
        name: i.metadata?.name || i.name,
        provisioner: i.provisioner,
      }))
    );
  }, [loaded, result]);

  const commonEntries = useMemo<StorageClassEntry[]>(() => {
    if (!loaded || parsedArrays.length === 0) return [];
    let intersection = new Set(
      parsedArrays[0].map((e) => `${e.name}|${e.provisioner}`)
    );
    parsedArrays.slice(1).forEach((arr) => {
      const s = new Set(arr.map((e) => `${e.name}|${e.provisioner}`));
      intersection = new Set([...intersection].filter((k) => s.has(k)));
    });
    return Array.from(intersection).map((key) => {
      const [name, provisioner] = key.split('|');
      return { name, provisioner };
    });
  }, [loaded, parsedArrays]);

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string | number | undefined>();

  const onToggleClick = useCallback(() => setIsOpen((o) => !o), []);
  const onOpenChange = useCallback((open: boolean) => setIsOpen(open), []);

  const onSelectItem = useCallback(
    (
      _event: React.MouseEvent<Element, MouseEvent> | undefined,
      value: string | number | undefined
    ) => {
      setSelected(value);
      setIsOpen(false);
      if (typeof value === 'string') {
        const [name, provisioner] = value.split('|');
        onSelect?.({ name, provisioner });
      }
    },
    [onSelect]
  );

  const toggle = useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={onToggleClick}
        isExpanded={isOpen}
        className="pf-v5-u-w-75"
      >
        {selected
          ? commonEntries.find((e) => `${e.name}|${e.provisioner}` === selected)
              ?.name
          : 'Select storage class'}
      </MenuToggle>
    ),
    [isOpen, onToggleClick, selected, commonEntries]
  );

  const items = useMemo(
    () =>
      commonEntries.map((e) => {
        const key = `${e.name}|${e.provisioner}`;
        return (
          <DropdownItem key={key} value={key}>
            {`${e.name} (${e.provisioner})`}
          </DropdownItem>
        );
      }),
    [commonEntries]
  );

  if (!loaded) return <Spinner size="md" />;

  if (error) {
    return (
      <Alert
        variant={AlertVariant.danger}
        isInline
        title="Error loading storage classes"
      />
    );
  }

  return (
    <Dropdown
      isOpen={isOpen}
      onSelect={onSelectItem}
      onOpenChange={onOpenChange}
      toggle={toggle}
      ouiaId="common-storage-class-dropdown"
      shouldFocusToggleOnSelect
    >
      <DropdownList>{items}</DropdownList>
    </Dropdown>
  );
};

export default CommonStorageClassDropdown;
