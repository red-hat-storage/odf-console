import * as React from 'react';
import {
  K8sResourceCommon,
  K8sVerb,
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
  DropdownItemProps,
  Tooltip,
  DropdownDirection,
} from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';
import { useAccessReview } from '../hooks/rbac-hook';
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
  terminatingTooltip?: React.ReactNode;
};

type accessProp = {
  edit: {
    access: boolean;
    loading: boolean;
  };
  update: {
    access: boolean;
    loading: boolean;
  };
  delete: {
    access: boolean;
    loading: boolean;
  };
};

const defaultKebabItems = (
  t: TFunction,
  resourceLabel: string,
  access: accessProp
) => ({
  [ModalKeys.EDIT_LABELS]: (
    <Tooltip
      content={
        !access.edit.access &&
        !access.edit.loading &&
        t('You do not have permission to perform this action')
      }
      trigger={
        !access.edit.access && !access.edit.loading ? 'mouseenter' : 'manual'
      }
    >
      <DropdownItem
        key={ModalKeys.EDIT_LABELS}
        id={ModalKeys.EDIT_LABELS}
        isDisabled={!access.edit.access || access.edit.loading}
        data-test-action="Edit labels"
      >
        {t('Edit labels')}
      </DropdownItem>
    </Tooltip>
  ),
  [ModalKeys.EDIT_ANN]: (
    <Tooltip
      content={
        !access.edit.access &&
        !access.edit.loading &&
        t('You do not have permission to perform this action')
      }
      trigger={
        !access.edit.access && !access.edit.loading ? 'mouseenter' : 'manual'
      }
    >
      <DropdownItem
        key={ModalKeys.EDIT_ANN}
        id={ModalKeys.EDIT_ANN}
        isDisabled={!access.edit.access || access.edit.loading}
        data-test-action="Edit annotations"
      >
        {t('Edit annotations')}
      </DropdownItem>
    </Tooltip>
  ),
  [ModalKeys.EDIT_RES]: (
    <Tooltip
      content={
        !access.update.access &&
        !access.update.loading &&
        t('You do not have permission to perform this action')
      }
      trigger={
        !access.update.access && !access.update.loading
          ? 'mouseenter'
          : 'manual'
      }
    >
      <DropdownItem
        key={ModalKeys.EDIT_RES}
        id={ModalKeys.EDIT_RES}
        isDisabled={!access.update.access || access.update.loading}
        data-test-action={`Edit ${resourceLabel}`}
      >
        {t('Edit {{resourceLabel}}', { resourceLabel })}
      </DropdownItem>
    </Tooltip>
  ),
  [ModalKeys.DELETE]: (
    <Tooltip
      content={
        !access.delete.access &&
        !access.delete.loading &&
        t('You do not have permission to perform this action')
      }
      trigger={
        !access.delete.access && !access.delete.loading
          ? 'mouseenter'
          : 'manual'
      }
    >
      <DropdownItem
        key={ModalKeys.DELETE}
        id={ModalKeys.DELETE}
        isDisabled={!access.delete.access || access.delete.loading}
        data-test-action={`Delete ${resourceLabel}`}
      >
        {t('Delete {{resourceLabel}}', { resourceLabel })}
      </DropdownItem>
    </Tooltip>
  ),
});

export const Kebab: React.FC<KebabProps> = ({
  launchModal,
  extraProps,
  customKebabItems,
  toggleType = 'Kebab',
  isDisabled,
  customActionMap,
  terminatingTooltip,
}) => {
  const { t } = useCustomTranslation();

  const eventRef = React.useRef(undefined);
  const [toggleDirection, setToggleDirection] =
    React.useState<DropdownDirection>(DropdownDirection.down);
  const [isOpen, setOpen] = React.useState(false);

  const { resourceModel, resource } = extraProps;

  const resourceLabel = resourceModel.label;

  const history = useHistory();

  const getResource = (verb: K8sVerb) => {
    return {
      group: resourceModel?.apiGroup,
      resource: resourceModel?.plural,
      namespace: null,
      verb: verb,
    };
  };

  const [canEdit, editLoading] = useAccessReview(getResource('patch'));
  const [canUpdate, updateLoading] = useAccessReview(getResource('update'));
  const [canDelete, deleteLoading] = useAccessReview(getResource('delete'));

  const access = {
    edit: {
      access: canEdit,
      loading: editLoading,
    },
    update: {
      access: canUpdate,
      loading: updateLoading,
    },
    delete: {
      access: canDelete,
      loading: deleteLoading,
    },
  };

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
    const defaultResolved = defaultKebabItems(t, resourceLabel, access);
    const customResolved: CustomKebabItemsMap = customKebabItemsMap
      ? customKebabItemsMap
      : {};
    const { overrides, custom } = Object.entries(customResolved).reduce(
      (acc, [k, obj]) => {
        const dropdownItem = (
          <DropdownItem
            key={k}
            id={k}
            {...obj?.props}
            data-test-action={obj?.value}
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
    const deafultItems = Object.values(
      Object.assign(defaultResolved, overrides)
    );

    const customItems = Object.values(custom) ?? [];

    return [...customItems, ...deafultItems];
  }, [t, customKebabItemsMap, resourceLabel]);

  isDisabled = isDisabled ?? _.has(resource.metadata, 'deletionTimestamp');

  const toggle = React.useMemo(() => {
    const onToggle = (_, e) => {
      eventRef.current = e;
      return setOpen((open) => !open);
    };
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

  const content = _.has(resource.metadata, 'deletionTimestamp')
    ? terminatingTooltip || t('Resource is being deleted.')
    : '';
  return (
    <Tooltip
      content={content}
      trigger={isDisabled && content ? 'mouseenter' : 'manual'}
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
