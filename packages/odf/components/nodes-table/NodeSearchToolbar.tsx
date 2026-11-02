import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import './NodeSearchToolbar.scss';

type NodeSearchToolbarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
  // Extra toolbar items rendered before the search box (e.g. a bulk-select
  // dropdown). Each child should be wrapped in its own <ToolbarItem>.
  children?: React.ReactNode;
};

// Reusable search toolbar for the node-selection tables (Fusion Access SAN and
// IBM Storage Scale). The `children` slot is where shared controls such as a
// bulk-select dropdown can be added so both flows pick them up at once.
export const NodeSearchToolbar: React.FC<NodeSearchToolbarProps> = ({
  query,
  onQueryChange,
  placeholder,
  children,
}) => {
  const { t } = useCustomTranslation();
  const searchPlaceholder = placeholder ?? t('Find by name, label, or taint');

  return (
    <Toolbar>
      <ToolbarContent>
        {children}
        <ToolbarItem>
          <SearchInput
            className="odf-node-search-toolbar__search"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            value={query}
            onChange={(_event, value) => onQueryChange(value)}
            onClear={() => onQueryChange('')}
          />
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};
