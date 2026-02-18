import * as React from 'react';
import { DRPolicyModel } from '@odf/shared';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { DR_BASE_ROUTE } from '../../../constants';
import { ACMManagedClusterKind } from '../../../types';

type ClusterActionMenuProps = {
  cluster: ACMManagedClusterKind;
};

export const ClusterActionMenu: React.FC<ClusterActionMenuProps> = () => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePairCluster = React.useCallback(() => {
    const drPolicyNewRoute = `${DR_BASE_ROUTE}/policies/${referenceForModel(
      DRPolicyModel
    )}/~new`;
    navigate(drPolicyNewRoute);
  }, [navigate]);

  const onSelect = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const onToggle = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const MenuToggleComponent = React.useCallback(
    (toggleRef: React.Ref<any>) => (
      <MenuToggle
        ref={toggleRef}
        aria-label={t('Cluster actions')}
        variant="plain"
        onClick={onToggle}
        isExpanded={isOpen}
      >
        <EllipsisVIcon />
      </MenuToggle>
    ),
    [isOpen, onToggle, t]
  );

  return (
    <Dropdown
      onSelect={onSelect}
      toggle={MenuToggleComponent}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      popperProps={{ position: 'right' }}
    >
      <DropdownList>
        <DropdownItem key="pair-cluster" onClick={handlePairCluster}>
          {t('Pair cluster')}
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
};
