import * as React from 'react';
import { GraphElement } from '@patternfly/react-topology';

export type TopologySidebarProps<
  TContext extends { selectedElement: GraphElement },
> = {
  onClose: () => void;
  isExpanded: boolean;
  context: React.Context<TContext>;
  children: (resource: any) => React.ReactNode;
};

/**
 * Generic topology sidebar wrapper that extracts the selected element's resource
 * from a topology context and passes it to the render prop.
 */
export const TopologySidebar = <
  TContext extends { selectedElement: GraphElement },
>({
  isExpanded,
  context,
  children,
}: TopologySidebarProps<TContext>): React.ReactElement | null => {
  const { selectedElement } = React.useContext(context);
  const data = selectedElement?.getData();
  const resource = data?.resource;

  if (!isExpanded) {
    return null;
  }

  return <>{children(resource)}</>;
};
