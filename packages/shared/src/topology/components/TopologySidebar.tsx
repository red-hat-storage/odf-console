import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { GraphElement } from '@patternfly/react-topology';

export type TopologySidebarProps<
  TContext extends { selectedElement: GraphElement },
  TResource extends K8sResourceCommon = K8sResourceCommon,
> = {
  onClose: () => void;
  isExpanded: boolean;
  context: React.Context<TContext>;
  children: (resource: TResource | undefined) => React.ReactNode;
};

/**
 * Generic topology sidebar wrapper that extracts the selected element's resource
 * from a topology context and passes it to the render prop.
 */
export const TopologySidebar = <
  TContext extends { selectedElement: GraphElement },
  TResource extends K8sResourceCommon = K8sResourceCommon,
>({
  isExpanded,
  context,
  children,
}: TopologySidebarProps<TContext, TResource>): React.ReactElement | null => {
  const { selectedElement } = React.useContext(context);

  // Memoize resource extraction to avoid unnecessary recalculations
  const resource = React.useMemo(() => {
    const data = selectedElement?.getData();
    return data?.resource as TResource | undefined;
  }, [selectedElement]);

  if (!isExpanded) {
    return null;
  }

  return <>{children(resource)}</>;
};
