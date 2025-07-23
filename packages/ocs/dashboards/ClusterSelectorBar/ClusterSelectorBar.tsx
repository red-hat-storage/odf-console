import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Flex,
  FlexItem,
  Icon,
  MenuToggle,
  Dropdown,
  DropdownList,
  DropdownItem,
} from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import {
  OCSDashboardContext,
  OCSDashboardDispatchContext,
} from '../ocs-dashboard-providers';
import './ClusterSelectorBar.scss';

export const ClusterSelectorBar: React.FC = () => {
  const { t } = useCustomTranslation();
  const {
    selectedCluster: { isExternalMode },
    hasMultipleStorageClusters,
  } = React.useContext(OCSDashboardContext);
  const { switchStorageCluster } = React.useContext(
    OCSDashboardDispatchContext
  );

  const dropdownText = isExternalMode
    ? t('External cluster (Ceph)')
    : t('Internal cluster');

  const [isOpen, setIsOpen] = React.useState(false);
  const onSelect = (
    _event: React.MouseEvent<HTMLButtonElement>,
    value: string
  ) => {
    if (
      (isExternalMode && value === 'internal') ||
      (!isExternalMode && value === 'external')
    ) {
      switchStorageCluster();
    }
    setIsOpen(false);
  };
  const dropdownToggleRef = React.useRef();

  return hasMultipleStorageClusters ? (
    <Flex className="odf-cluster-selector-bar">
      <FlexItem>
        <Icon status="info" className="pf-v5-u-mr-sm">
          <InfoCircleIcon />
        </Icon>
        {t(
          'Both internal and external Ceph clusters configured. Switch between internal and external Ceph clusters and view their respective storage resources'
        )}
      </FlexItem>
      <FlexItem align={{ default: 'alignRight' }}>
        <Dropdown
          isOpen={isOpen}
          onSelect={onSelect}
          toggle={{
            toggleNode: (
              <MenuToggle
                onClick={() => setIsOpen(!isOpen)}
                isExpanded={isOpen}
                aria-label="Dropdown toggle"
                ref={dropdownToggleRef}
              >
                {dropdownText}
              </MenuToggle>
            ),
            toggleRef: dropdownToggleRef,
          }}
          shouldFocusToggleOnSelect
          ouiaId="cluster-selector-bar"
          zIndex={1000}
        >
          <DropdownList>
            <DropdownItem value="internal" key="internal">
              {t('Internal cluster')}
            </DropdownItem>
            <DropdownItem value="external" key="external">
              {t('External cluster (Ceph)')}
            </DropdownItem>
          </DropdownList>
        </Dropdown>
      </FlexItem>
    </Flex>
  ) : null;
};
