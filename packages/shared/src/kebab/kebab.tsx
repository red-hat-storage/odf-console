import * as React from 'react';
import { useCallback } from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { TFunction } from 'i18next';
import * as _ from 'lodash-es';
import { useNavigate } from 'react-router';
import {
  Menu,
  MenuContainer,
  MenuContent,
  MenuItem,
  MenuList,
  MenuToggle,
  Tooltip,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { useAccessReview } from '../hooks/rbac-hook';
import { ModalKeys, defaultModalMap } from '../modals/types';
import { useModalWrapper } from '../sdk-wrapper/useModalWrapper';
import { useCustomTranslation } from '../useCustomTranslationHook';
import { referenceForModel } from '../utils';

export type CustomKebabItem = {
  key: string;
  value: string;
  isDisabled?: boolean;
  description?: React.ReactNode;
  component?: React.LazyExoticComponent<any>;
  redirect?: string;
};

type CustomKebabItemsMap = {
  [key in string]: CustomKebabItem;
};

type KebabProps = {
  extraProps: {
    resource: K8sResourceCommon;
    resourceModel: K8sModel;
    [key: string]: any;
    forceDeletion?: boolean;
    confirmWithName?: boolean;
  };
  customKebabItems?: CustomKebabItem[];
  toggleType?: 'Kebab' | 'Dropdown';
  isDisabled?: boolean;
  customActionMap?: {
    [key: string]: () => void;
  };
  terminatingTooltip?: React.ReactNode;
  hideItems?: ModalKeys[];
  customLabel?: string;
  'data-test'?: string;
};

type KebabStaticProperties = {
  columnClass?: string;
};

const defaultKebabItems = (t: TFunction, resourceLabel: string) => ({
  [ModalKeys.EDIT_LABELS]: (
    <MenuItem
      key={ModalKeys.EDIT_LABELS}
      id={ModalKeys.EDIT_LABELS}
      itemId={ModalKeys.EDIT_LABELS}
      data-test-action="Edit labels"
    >
      {t('Edit labels')}
    </MenuItem>
  ),
  [ModalKeys.EDIT_ANN]: (
    <MenuItem
      key={ModalKeys.EDIT_ANN}
      id={ModalKeys.EDIT_ANN}
      itemId={ModalKeys.EDIT_ANN}
      data-test-action="Edit annotations"
    >
      {t('Edit annotations')}
    </MenuItem>
  ),
  [ModalKeys.EDIT_RES]: (
    <MenuItem
      key={ModalKeys.EDIT_RES}
      id={ModalKeys.EDIT_RES}
      itemId={ModalKeys.EDIT_RES}
      data-test-action={`Edit ${resourceLabel}`}
    >
      {t('Edit {{resourceLabel}}', { resourceLabel })}
    </MenuItem>
  ),
  [ModalKeys.DELETE]: (
    <MenuItem
      key={ModalKeys.DELETE}
      id={ModalKeys.DELETE}
      itemId={ModalKeys.DELETE}
      isDanger
      data-test-action={`Delete ${resourceLabel}`}
    >
      {t('Delete {{resourceLabel}}', { resourceLabel })}
    </MenuItem>
  ),
});

export const Kebab: React.FC<KebabProps> & KebabStaticProperties = ({
  extraProps,
  customKebabItems,
  toggleType = 'Kebab',
  isDisabled,
  terminatingTooltip,
  hideItems,
  customLabel,
  'data-test': dataTestId,
}) => {
  const { t } = useCustomTranslation();
  const launchModal = useModalWrapper();
  const menuRef = React.useRef<HTMLDivElement>(null);
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const [isOpen, setOpen] = React.useState(false);
  const onOpenChange = useCallback((open: boolean) => setOpen(open), []);

  const { resourceModel, resource } = extraProps;
  const resourceLabel = customLabel ?? resourceModel.label;
  const navigate = useNavigate();

  const [canCreate, createLoading] = useAccessReview({
    group: resourceModel?.apiGroup,
    resource: resourceModel?.plural,
    name: getName(resource),
    ...(!!resourceModel?.namespaced
      ? { namespace: getNamespace(resource) }
      : {}),
    verb: 'create',
  });

  const showPermissionTooltip = !canCreate && !createLoading;

  const customKebabItemsMap: CustomKebabItemsMap = React.useMemo(
    () =>
      customKebabItems
        ? customKebabItems?.reduce(
            (acc, item) => ({ ...acc, [item.key]: item }),
            {}
          )
        : {},
    [customKebabItems]
  );

  const onClick = (
    _event?: React.MouseEvent<Element, MouseEvent>,
    value?: string | number
  ) => {
    setOpen(false);
    const modalComponentProps = { extraProps, isOpen: true };
    const actionKey = value as string;
    const modalComponent =
      customKebabItemsMap[actionKey]?.component || defaultModalMap[actionKey];
    const redirectLink = customKebabItemsMap[actionKey]?.redirect;
    if (actionKey === ModalKeys.EDIT_RES && !customKebabItemsMap?.[actionKey]) {
      const editPrefix = extraProps?.cluster
        ? `/odf/edit/${extraProps?.cluster}`
        : '/k8s';
      let basePath = resourceModel?.namespaced
        ? `${editPrefix}/ns/${resource?.metadata?.namespace}`
        : `${editPrefix}/cluster`;
      navigate(
        `${basePath}/${referenceForModel(resourceModel)}/${
          resource?.metadata?.name
        }/yaml`
      );
    } else if (redirectLink) {
      navigate(redirectLink);
    } else {
      launchModal(modalComponent, modalComponentProps);
    }
  };

  const menuItems = React.useMemo(() => {
    const defaultResolved = defaultKebabItems(t, resourceLabel);
    const filteredDefaultItems = hideItems
      ? Object.keys(defaultResolved)
          .filter((key) => !hideItems.includes(key as ModalKeys))
          .reduce((obj, key) => {
            obj[key] = defaultResolved[key];
            return obj;
          }, {})
      : defaultResolved;
    const customResolved: CustomKebabItemsMap = customKebabItemsMap
      ? customKebabItemsMap
      : {};
    const { overrides, custom } = Object.entries(customResolved).reduce(
      (acc, [k, obj]) => {
        if (hideItems?.includes(k as ModalKeys)) {
          return acc;
        }
        const menuItem = (
          <MenuItem
            key={k}
            id={k}
            itemId={k}
            data-test-action={obj?.value}
            isDisabled={obj?.isDisabled}
            description={obj?.description}
            isDanger={k === ModalKeys.DELETE}
          >
            {obj?.value}
          </MenuItem>
        );

        if (
          [
            ModalKeys.EDIT_LABELS,
            ModalKeys.EDIT_ANN,
            ModalKeys.DELETE,
            ModalKeys.EDIT_RES,
          ].includes(k as ModalKeys)
        ) {
          acc['overrides'][k] = menuItem;
        } else {
          acc['custom'][k] = menuItem;
        }
        return acc;
      },
      {
        overrides: {} as Record<string, React.ReactNode>,
        custom: {} as Record<string, React.ReactNode>,
      }
    );
    const defaultItems = Object.values(
      Object.assign(filteredDefaultItems, overrides)
    );

    const customItems = Object.values(custom) ?? [];

    return [...customItems, ...defaultItems];
  }, [t, customKebabItemsMap, resourceLabel, hideItems]);

  isDisabled =
    isDisabled ||
    (!extraProps?.forceDeletion &&
      _.has(resource?.metadata, 'deletionTimestamp')) ||
    !canCreate;

  const content = _.has(resource?.metadata, 'deletionTimestamp')
    ? terminatingTooltip || t('Resource is being deleted.')
    : '';

  const toggle = (
    <Tooltip
      content={
        showPermissionTooltip
          ? t('You do not have permission to perform this action')
          : content
      }
      trigger={
        showPermissionTooltip || (isDisabled && content)
          ? 'mouseenter'
          : 'manual'
      }
    >
      <MenuToggle
        ref={toggleRef}
        aria-label="Kebab toggle"
        variant={toggleType === 'Kebab' ? 'plain' : 'default'}
        onClick={() => setOpen(!isOpen)}
        isExpanded={isOpen}
        data-test={dataTestId || 'kebab-button'}
        isDisabled={isDisabled}
      >
        {toggleType === 'Kebab' ? <EllipsisVIcon /> : t('Actions')}
      </MenuToggle>
    </Tooltip>
  );

  const menu = (
    <Menu
      ref={menuRef}
      onSelect={onClick}
      data-test={`${dataTestId || 'kebab-button'}-menu`}
      data-test-id={`${dataTestId || 'kebab-button'}-menu`}
    >
      <MenuContent>
        <MenuList>{menuItems}</MenuList>
      </MenuContent>
    </Menu>
  );

  return (
    <MenuContainer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      toggle={toggle}
      toggleRef={toggleRef}
      menu={menu}
      menuRef={menuRef}
      popperProps={{
        direction: 'down',
        position: 'right',
        enableFlip: true,
      }}
    />
  );
};

Kebab.columnClass = 'dropdown-kebab-pf pf-v6-c-table__action pf-v6-u-min-width';
