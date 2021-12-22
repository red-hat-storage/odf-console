import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { Dropdown, DropdownItem, KebabToggle } from '@patternfly/react-core';

type Action<T> = {
  actionName: string;
  onClick: (resource: T) => void;
  disabled?: boolean;
};

type KebabProps<T = K8sResourceCommon> = {
  actions: Action<T>[];
  resource: T;
};

type KebabMenuFC = <T>(
  props: React.PropsWithChildren<KebabProps<T>>
) => ReturnType<React.FC>;

export const KebabMenu: KebabMenuFC = ({ actions, resource }) => {
  const [isOpen, setOpen] = React.useState(false);

  const dropdownItems = React.useMemo(
    () =>
      actions.map((action) => (
        <DropdownItem
          key={action.actionName}
          component="button"
          onClick={() => action.onClick(resource)}
        >
          {action.actionName}
        </DropdownItem>
      )),
    [actions, resource]
  );

  return (
    <Dropdown
      onSelect={() => setOpen((open) => !open)}
      toggle={<KebabToggle onToggle={() => setOpen((open) => !open)} />}
      isOpen={isOpen}
      isPlain
      dropdownItems={dropdownItems}
      position='right'
    />
  );
};
