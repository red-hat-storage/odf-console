import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  Dropdown,
  DropdownItem,
  DropdownToggle,
  KebabToggle,
  DropdownItemProps,
} from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';
import { ModalKeys, LaunchModal } from '../modals/modalLauncher';

type KebabProps = {
  launchModal: LaunchModal;
  extraProps: {
    resource: K8sResourceCommon;
    resourceModel: K8sModel;
    [key: string]: any;
  };
  customKebabItems?: (t: TFunction) => {
    [key: string]: {
      value: string;
      props?: DropdownItemProps;
    };
  };
  toggleType?: 'Kebab' | 'Dropdown';
  isDisabled?: boolean;
};

const defaultKebabItems = (t: TFunction) => ({
  [ModalKeys.EDIT_LABELS]: (
    <DropdownItem key={ModalKeys.EDIT_LABELS} id={ModalKeys.EDIT_LABELS}>
      {t('plugin__odf-console~Edit Labels')}
    </DropdownItem>
  ),
  [ModalKeys.EDIT_ANN]: (
    <DropdownItem key={ModalKeys.EDIT_ANN} id={ModalKeys.EDIT_ANN}>
      {t('plugin__odf-console~Edit Annotations')}
    </DropdownItem>
  ),
  [ModalKeys.DELETE]: (
    <DropdownItem key={ModalKeys.DELETE} id={ModalKeys.DELETE}>
      {t('plugin__odf-console~Delete')}
    </DropdownItem>
  ),
});

export const Kebab: React.FC<KebabProps> = ({
  launchModal,
  extraProps,
  customKebabItems,
  toggleType = 'Kebab',
  isDisabled,
}) => {
  const { t } = useTranslation('plugin__odf-console');

  const [isOpen, setOpen] = React.useState(false);

  const onClick = (event?: React.SyntheticEvent<HTMLDivElement>) => {
    setOpen(false);
    const actionKey = event.currentTarget.id;
    launchModal(actionKey, extraProps);
  };

  const dropdownItems = React.useMemo(() => {
    const defaultResolved = defaultKebabItems(t);
    const customResolved = customKebabItems ? customKebabItems(t) : {};
    const { overrides, custom } = Object.entries(customResolved).reduce(
      (acc, [k, obj]) => {
        const dropdownItem = (
          <DropdownItem key={k} id={k} {...obj?.props}>
            {obj?.value}
          </DropdownItem>
        );

        if (
          [
            ModalKeys.EDIT_LABELS,
            ModalKeys.EDIT_ANN,
            ModalKeys.DELETE,
          ].includes(k as ModalKeys)
        ) {
          acc['overrides'][k] = dropdownItem;
        } else {
          acc['custom'][k] = dropdownItem;
        }
        return acc;
      },
      { overrides: {}, custom: {} }
    );
    const deafultItems = Object.values(
      Object.assign(defaultResolved, overrides)
    );

    const customItems = Object.values(custom) ?? [];

    return [...customItems, ...deafultItems];
  }, [t, customKebabItems]);

  const toggle = React.useMemo(() => {
    const onToggle = () => setOpen((open) => !open);
    return toggleType === 'Kebab' ? (
      <KebabToggle onToggle={onToggle} isDisabled={isDisabled} />
    ) : (
      <DropdownToggle
        onToggle={onToggle}
        toggleIndicator={CaretDownIcon}
        isDisabled={isDisabled}
      >
        Actions
      </DropdownToggle>
    );
  }, [setOpen, toggleType, isDisabled]);

  return (
    <Dropdown
      onSelect={onClick}
      toggle={toggle}
      isOpen={isOpen}
      isPlain={toggleType === 'Kebab' ? true : false}
      dropdownItems={dropdownItems}
      position="right"
    />
  );
};
