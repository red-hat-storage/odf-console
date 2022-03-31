import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Dropdown, DropdownItem, KebabToggle } from '@patternfly/react-core';
import { ModalKeys, LaunchModal } from '../modals/modalLauncher';

type KebabProps = {
  launchModal: LaunchModal;
  extraProps: {
    resource: K8sResourceCommon;
    resourceModel: K8sModel;
  };
  customKebabItems?: (t: TFunction) => {
    [key: string]: string;
  };
};

const defaultKebabItems = (t: TFunction) => [
  <DropdownItem key={ModalKeys.EDIT_LABELS} id={ModalKeys.EDIT_LABELS}>
    {t('plugin__odf-console~Edit Labels')}
  </DropdownItem>,
  <DropdownItem key={ModalKeys.EDIT_ANN} id={ModalKeys.EDIT_ANN}>
    {t('plugin__odf-console~Edit Annotations')}
  </DropdownItem>,
  <DropdownItem key={ModalKeys.DELETE} id={ModalKeys.DELETE}>
    {t('plugin__odf-console~Delete')}
  </DropdownItem>,
];

export const Kebab: React.FC<KebabProps> = ({
  launchModal,
  extraProps,
  customKebabItems,
}) => {
  const { t } = useTranslation('plugin__odf-console');

  const [isOpen, setOpen] = React.useState(false);

  const onClick = (event?: React.SyntheticEvent<HTMLDivElement>) => {
    setOpen(false);
    const actionKey = event.currentTarget.id;
    launchModal(actionKey, extraProps);
  };

  const drpodownItems = React.useMemo(() => {
    const customItems = Object.entries(
      customKebabItems ? customKebabItems(t) : {}
    ).map(([k, v]) => {
      return (
        <DropdownItem key={k} id={k}>
          {v}
        </DropdownItem>
      );
    });
    return [...customItems, ...defaultKebabItems(t)];
  }, [t, customKebabItems]);

  return (
    <Dropdown
      onSelect={onClick}
      toggle={<KebabToggle onToggle={() => setOpen((open) => !open)} />}
      isOpen={isOpen}
      isPlain
      dropdownItems={drpodownItems}
      position="right"
    />
  );
};
