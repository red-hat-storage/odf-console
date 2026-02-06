import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import {
  K8sResourceCommon,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Dropdown,
  DropdownItem,
  DropdownPopperProps,
  MenuToggle,
  Tooltip,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { useAccessReview } from '../hooks/rbac-hook';
import { ModalKeys, defaultModalMap } from '../modals/types';
import { useCustomTranslation } from '../useCustomTranslationHook';
import { referenceForModel } from '../utils';

const useClickOutside = (
  dropdownRef: React.RefObject<HTMLElement>,
  dropdownToggleRef: React.RefObject<HTMLElement>,
  callback: () => void
) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Dropdown and its toggle button are 2 separate elements at the same
      // nesting level, so we check that we're interacting outside both.
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownToggleRef.current &&
        !dropdownToggleRef.current.contains(event.target as Node)
      ) {
        callback();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [dropdownRef, dropdownToggleRef, callback]);
};

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
    <DropdownItem
      key={ModalKeys.EDIT_LABELS}
      id={ModalKeys.EDIT_LABELS}
      value={ModalKeys.EDIT_LABELS}
      data-test-action="Edit labels"
    >
      {t('Edit labels')}
    </DropdownItem>
  ),
  [ModalKeys.EDIT_ANN]: (
    <DropdownItem
      key={ModalKeys.EDIT_ANN}
      id={ModalKeys.EDIT_ANN}
      value={ModalKeys.EDIT_ANN}
      data-test-action="Edit annotations"
    >
      {t('Edit annotations')}
    </DropdownItem>
  ),
  [ModalKeys.EDIT_RES]: (
    <DropdownItem
      key={ModalKeys.EDIT_RES}
      id={ModalKeys.EDIT_RES}
      value={ModalKeys.EDIT_RES}
      data-test-action={`Edit ${resourceLabel}`}
    >
      {t('Edit {{resourceLabel}}', { resourceLabel })}
    </DropdownItem>
  ),
  [ModalKeys.DELETE]: (
    <DropdownItem
      key={ModalKeys.DELETE}
      id={ModalKeys.DELETE}
      value={ModalKeys.DELETE}
      data-test-action={`Delete ${resourceLabel}`}
    >
      {t('Delete {{resourceLabel}}', { resourceLabel })}
    </DropdownItem>
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
  const launchModal = useModal();
  const eventRef = React.useRef(undefined);
  const dropdownRef = React.useRef();
  const dropdownToggleRef = React.useRef();
  const [toggleDirection, setToggleDirection] =
    React.useState<DropdownPopperProps['direction']>('down');
  const [isOpen, setOpen] = React.useState(false);
  const closeDropdown = useCallback(() => setOpen(false), []);

  // Use the custom hook to detect clicks outside the Kebab menu
  useClickOutside(dropdownRef, dropdownToggleRef, closeDropdown);

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

  React.useLayoutEffect(() => {
    const e = eventRef.current;
    if (toggleType === 'Kebab' && !!e) {
      const clientY = e?.clientY; // y-coordinate of kebab button onclick
      const clientHeight = e?.target?.nextSibling?.clientHeight; // height of popper menu, which is a sibling of kebab button
      const windowHeight =
        document.getElementsByTagName('body')[0].clientHeight; // height of viewport

      if (clientY + clientHeight >= windowHeight) setToggleDirection('up');
      else setToggleDirection('down');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventRef.current, toggleType]);

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

  const dropdownItems = React.useMemo(() => {
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
        const dropdownItem = (
          <DropdownItem
            key={k}
            id={k}
            value={k}
            data-test-action={obj?.value}
            isDisabled={obj?.isDisabled}
            description={obj?.description}
          >
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

  return (
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
      <Dropdown
        data-test={dataTestId || 'kebab-button'}
        onSelect={onClick}
        ref={dropdownRef}
        toggle={{
          toggleNode: (
            <MenuToggle
              ref={dropdownToggleRef}
              aria-label="Dropdown toggle"
              variant={toggleType === 'Kebab' ? 'plain' : 'default'}
              onClick={() => setOpen(!isOpen)}
              isExpanded={isOpen}
              data-test={dataTestId || 'kebab-button'}
              isDisabled={isDisabled}
            >
              {toggleType === 'Kebab' ? <EllipsisVIcon /> : t('Actions')}
            </MenuToggle>
          ),
          toggleRef: dropdownToggleRef,
        }}
        isOpen={isOpen}
        data-test-id={dataTestId || 'kebab-button'}
        popperProps={{
          preventOverflow: true,
          direction: toggleDirection,
          enableFlip: true,
          position: 'right',
        }}
        shouldFocusFirstItemOnOpen={false}
      >
        {dropdownItems}
      </Dropdown>
    </Tooltip>
  );
};

Kebab.columnClass = 'dropdown-kebab-pf pf-v5-c-table__action pf-v5-u-min-width';
