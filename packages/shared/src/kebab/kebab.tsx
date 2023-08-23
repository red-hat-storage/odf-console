import * as React from 'react';
import { getNamespace, getName } from '@odf/shared/selectors';
import {
  K8sResourceCommon,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { TFunction } from 'i18next';
import * as _ from 'lodash-es';
import { useHistory } from 'react-router';
import {
  Dropdown,
  DropdownItem,
  DropdownToggle,
  KebabToggle,
  Tooltip,
  DropdownDirection,
} from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';
import { useAccessReview } from '../hooks/rbac-hook';
import { ModalKeys, defaultModalMap } from '../modals/types';
import { useCustomTranslation } from '../useCustomTranslationHook';
import { referenceForModel } from '../utils';

export type CustomKebabItem = {
  key: string;
  value: string;
  component?: React.LazyExoticComponent<any>;
};

type CustomKebabItemsMap = {
  [key in string]: CustomKebabItem;
};

type KebabProps = {
  extraProps: {
    resource: K8sResourceCommon;
    resourceModel: K8sModel;
    [key: string]: any;
  };
  customKebabItems?: CustomKebabItem[];
  toggleType?: 'Kebab' | 'Dropdown';
  isDisabled?: boolean;
  customActionMap?: {
    [key: string]: () => void;
  };
  terminatingTooltip?: React.ReactNode;
};

const defaultKebabItems = (t: TFunction, resourceLabel: string) => ({
  [ModalKeys.EDIT_LABELS]: (
    <DropdownItem
      key={ModalKeys.EDIT_LABELS}
      id={ModalKeys.EDIT_LABELS}
      data-test-action="Edit labels"
    >
      {t('Edit labels')}
    </DropdownItem>
  ),
  [ModalKeys.EDIT_ANN]: (
    <DropdownItem
      key={ModalKeys.EDIT_ANN}
      id={ModalKeys.EDIT_ANN}
      data-test-action="Edit annotations"
    >
      {t('Edit annotations')}
    </DropdownItem>
  ),
  [ModalKeys.EDIT_RES]: (
    <DropdownItem
      key={ModalKeys.EDIT_RES}
      id={ModalKeys.EDIT_RES}
      data-test-action={`Edit ${resourceLabel}`}
    >
      {t('Edit {{resourceLabel}}', { resourceLabel })}
    </DropdownItem>
  ),
  [ModalKeys.DELETE]: (
    <DropdownItem
      key={ModalKeys.DELETE}
      id={ModalKeys.DELETE}
      data-test-action={`Delete ${resourceLabel}`}
    >
      {t('Delete {{resourceLabel}}', { resourceLabel })}
    </DropdownItem>
  ),
});

export const Kebab: React.FC<KebabProps> = ({
  extraProps,
  customKebabItems,
  toggleType = 'Kebab',
  isDisabled,
  terminatingTooltip,
}) => {
  const { t } = useCustomTranslation();

  const launchModal = useModal();

  const eventRef = React.useRef(undefined);
  const [toggleDirection, setToggleDirection] =
    React.useState<DropdownDirection>(DropdownDirection.down);
  const [isOpen, setOpen] = React.useState(false);

  const { resourceModel, resource } = extraProps;

  const resourceLabel = resourceModel.label;

  const history = useHistory();

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

      if (clientY + clientHeight >= windowHeight)
        setToggleDirection(DropdownDirection.up);
      else setToggleDirection(DropdownDirection.down);
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

  const onClick = (event?: React.SyntheticEvent<HTMLDivElement>) => {
    setOpen(false);
    const modalComponentProps = { extraProps, isOpen: true };
    const actionKey = event.currentTarget.id;
    const modalComponent =
      customKebabItemsMap[actionKey]?.component || defaultModalMap[actionKey];
    if (actionKey === ModalKeys.EDIT_RES && !customKebabItemsMap?.[actionKey]) {
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
      launchModal(modalComponent, modalComponentProps);
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
          <DropdownItem key={k} id={k} data-test-action={obj?.value}>
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

  isDisabled =
    isDisabled || _.has(resource.metadata, 'deletionTimestamp') || !canCreate;

  const toggle = React.useMemo(() => {
    const onToggle = (_unused, e) => {
      eventRef.current = e;
      return setOpen((open) => !open);
    };
    return toggleType === 'Kebab' ? (
      <KebabToggle onToggle={onToggle} isDisabled={isDisabled} />
    ) : (
      <DropdownToggle
        data-test="kebab-dropdown-toggle"
        onToggle={onToggle}
        toggleIndicator={CaretDownIcon}
        isDisabled={isDisabled}
      >
        Actions
      </DropdownToggle>
    );
  }, [setOpen, toggleType, isDisabled]);

  const content = _.has(resource.metadata, 'deletionTimestamp')
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
        data-test="kebab-button"
        onSelect={onClick}
        toggle={toggle}
        isOpen={isOpen}
        isPlain={toggleType === 'Kebab' ? true : false}
        dropdownItems={dropdownItems}
        data-test-id="kebab-button"
        position="right"
        direction={toggleDirection}
      />
    </Tooltip>
  );
};
