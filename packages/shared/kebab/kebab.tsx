import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { TFunction } from 'i18next';
import { useHistory } from 'react-router';
import {
  Dropdown,
  DropdownItem,
  DropdownToggle,
  KebabToggle,
  DropdownItemProps,
} from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';
import { ModalKeys, LaunchModal } from '../modals/modalLauncher';
import { useCustomTranslation } from '../useCustomTranslationHook';
import { referenceForModel } from '../utils';

export type CustomKebabItems = {
  key: string;
  value: string;
  props?: DropdownItemProps;
};

type CustomKebabItemsMap = {
  [key in string]: CustomKebabItems;
};

type KebabProps = {
  launchModal: LaunchModal;
  extraProps: {
    resource: K8sResourceCommon;
    resourceModel: K8sModel;
    [key: string]: any;
  };
  customKebabItems?: (t: TFunction) => CustomKebabItems[];
  toggleType?: 'Kebab' | 'Dropdown';
  isDisabled?: boolean;
  customActionMap?: {
    [key: string]: () => void;
  };
};

const defaultKebabItems = (t: TFunction, resourceLabel: string) => ({
  [ModalKeys.EDIT_LABELS]: (
    <DropdownItem key={ModalKeys.EDIT_LABELS} id={ModalKeys.EDIT_LABELS}>
      {t('Edit labels')}
    </DropdownItem>
  ),
  [ModalKeys.EDIT_ANN]: (
    <DropdownItem key={ModalKeys.EDIT_ANN} id={ModalKeys.EDIT_ANN}>
      {t('Edit annotations')}
    </DropdownItem>
  ),
  [ModalKeys.EDIT_RES]: (
    <DropdownItem key={ModalKeys.EDIT_RES} id={ModalKeys.EDIT_RES}>
      {t('Edit {{resourceLabel}}', { resourceLabel })}
    </DropdownItem>
  ),
  [ModalKeys.DELETE]: (
    <DropdownItem key={ModalKeys.DELETE} id={ModalKeys.DELETE}>
      {t('Delete {{resourceLabel}}', { resourceLabel })}
    </DropdownItem>
  ),
});

export const Kebab: React.FC<KebabProps> = ({
  launchModal,
  extraProps,
  customKebabItems,
  toggleType = 'Kebab',
  isDisabled,
  customActionMap,
}) => {
  const { t } = useCustomTranslation();

  const [isOpen, setOpen] = React.useState(false);

  const { resourceModel, resource } = extraProps;

  const resourceLabel = resourceModel.label;

  const history = useHistory();

  const customKebabItemsMap: CustomKebabItemsMap = React.useMemo(
    () =>
      customKebabItems
        ? customKebabItems(t)?.reduce(
            (acc, item) => ({ ...acc, [item.key]: item }),
            {}
          )
        : {},
    [customKebabItems, t]
  );

  const onClick = (event?: React.SyntheticEvent<HTMLDivElement>) => {
    setOpen(false);
    const actionKey = event.currentTarget.id;
    if (customActionMap?.[actionKey]) {
      customActionMap[actionKey]?.();
    } else if (
      actionKey === ModalKeys.EDIT_RES &&
      !customKebabItemsMap?.[actionKey]
    ) {
      const editPrefix = extraProps?.cluster
        ? `/odf/edit/${extraProps?.cluster}`
        : '/k8s';
      let basePath = resourceModel?.namespaced
        ? `${editPrefix}/ns/${resource?.metadata?.namespace}`
        : `${editPrefix}/cluster`;
      history.push(
        `${basePath}/${referenceForModel(resourceModel)}/${
          resource?.metadata?.name
        }/yaml`
      );
    } else {
      launchModal(actionKey, extraProps);
    }
  };

  const dropdownItems = React.useMemo(() => {
    const defaultResolved = defaultKebabItems(t, resourceLabel);
    const customResolved: CustomKebabItemsMap = customKebabItemsMap
      ? customKebabItemsMap
      : {};
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
            ModalKeys.EDIT_RES,
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
  }, [t, customKebabItemsMap, resourceLabel]);

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
      data-test="kebab-button"
      onSelect={onClick}
      toggle={toggle}
      isOpen={isOpen}
      isPlain={toggleType === 'Kebab' ? true : false}
      dropdownItems={dropdownItems}
      position="right"
    />
  );
};
