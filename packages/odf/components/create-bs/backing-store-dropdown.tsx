import * as React from 'react';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import { backingStoreResource } from '@odf/core/resources';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Alert,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownToggle,
} from '@patternfly/react-core';
import { BackingStoreKind } from '../../types';
import '../../style.scss';

export const BackingStoreDropdown: React.FC<BackingStoreDropdownProps> = ({
  id,
  onChange,
  className,
  selectedKey,
  creatorDisabled,
  launchBackingStoreModal,
}) => {
  const { t } = useCustomTranslation();
  const [isOpen, setOpen] = React.useState(false);

  const [nbsData, , nbsLoadErr] =
    useSafeK8sWatchResource<BackingStoreKind[]>(backingStoreResource);
  const noobaaBackingStores: BackingStoreKind[] = useDeepCompareMemoize(
    nbsData,
    true
  );

  const [nsName, setNSName] = React.useState('');
  const handleDropdownChange = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      setNSName(e.currentTarget.id);
      onChange(
        noobaaBackingStores.find(
          (nbs) => nbs?.metadata?.name === e.currentTarget.id
        )
      );
    },
    [noobaaBackingStores, onChange]
  );

  const getDropdownItems = React.useCallback(
    (backingStoreList: BackingStoreKind[]) => {
      return backingStoreList.reduce(
        (res, nbs) => {
          res.push(
            <DropdownItem
              key={nbs.metadata.uid}
              component="button"
              id={nbs?.metadata?.name}
              onClick={handleDropdownChange}
              data-test={`${nbs?.metadata?.name}-dropdown-item`}
              description={t('Provider {{provider}}', {
                provider: nbs?.spec?.type,
              })}
            >
              {nbs?.metadata?.name}
            </DropdownItem>
          );
          return res;
        },
        !creatorDisabled
          ? [
              <DropdownItem
                data-test="create-new-backingstore-button"
                key="first-item"
                component="button"
                onClick={() => launchBackingStoreModal()}
              >
                {t('Create new BackingStore ')}
              </DropdownItem>,
              <DropdownSeparator key="separator" />,
            ]
          : []
      );
    },
    [creatorDisabled, t, handleDropdownChange, launchBackingStoreModal]
  );

  const dropdownItems = getDropdownItems(noobaaBackingStores);

  return (
    <div className={className}>
      {nbsLoadErr && (
        <Alert
          className="nb-create-bc-step-page__danger"
          variant="danger"
          isInline
          title={t('An error has occured while fetching backing stores')}
        />
      )}
      <Dropdown
        className="dropdown--full-width"
        toggle={
          <DropdownToggle
            id="nbs-dropdown-id"
            data-test="nbs-dropdown-toggle"
            onToggle={() => setOpen(!isOpen)}
            isDisabled={!!nbsLoadErr}
          >
            {selectedKey || nsName || t('Select a backing store')}
          </DropdownToggle>
        }
        isOpen={isOpen}
        dropdownItems={dropdownItems}
        onSelect={() => setOpen(false)}
        id={id}
      />
    </div>
  );
};

type BackingStoreDropdownProps = {
  id: string;
  namespace: string;
  onChange?: (BackingStoreKind) => void;
  className?: string;
  selectedKey?: string;
  creatorDisabled?: boolean;
  launchBackingStoreModal?: () => void;
};
