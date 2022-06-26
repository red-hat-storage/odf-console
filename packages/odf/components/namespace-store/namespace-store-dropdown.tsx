import * as React from 'react';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownToggle,
} from '@patternfly/react-core';
import { NamespacePolicyType } from '../../constants';
import { namespaceStoreResource } from '../../resources';
import { NamespaceStoreKind } from '../../types';

export const NamespaceStoreDropdown: React.FC<NamespaceStoreDropdownProps> = ({
  id,
  namespace,
  onChange,
  className,
  selectedKey,
  enabledItems,
  namespacePolicy,
  creatorDisabled,
  launchModal,
}) => {
  const { t } = useCustomTranslation();
  const [isOpen, setOpen] = React.useState(false);
  const [dropdownItems, setDropdownItems] = React.useState<JSX.Element[]>([]);

  const [nnsData, , nnsLoadErr] = useK8sWatchResource<NamespaceStoreKind[]>(
    namespaceStoreResource
  );
  const noobaaNamespaceStores: NamespaceStoreKind[] = useDeepCompareMemoize(
    nnsData,
    true
  );

  React.useEffect(() => {
    const nnsDropdownItems = noobaaNamespaceStores.reduce(
      (res, nns) => {
        const name = getName(nns);
        res.push(
          <DropdownItem
            key={nns.metadata.uid}
            component="button"
            id={name}
            isDisabled={
              namespacePolicy === NamespacePolicyType.MULTI &&
              !enabledItems.some((itemName) => itemName === name)
            }
            onClick={(e) =>
              onChange(
                noobaaNamespaceStores.find(
                  (ns) => ns?.metadata?.name === e.currentTarget.id
                )
              )
            }
            data-test={`${name}-dropdown-item`}
            description={t('Provider {{provider}} | Region: {{region}}', {
              provider: nns?.spec?.type,
              region: nns?.spec?.awsS3?.region,
            })}
          >
            {name}
          </DropdownItem>
        );
        return res;
      },
      creatorDisabled
        ? []
        : [
            <DropdownItem
              data-test="create-new-namespacestore-button"
              key="first-item"
              component="button"
              onClick={launchModal}
            >
              {t('Create new NamespaceStore ')}
            </DropdownItem>,
            <DropdownSeparator key="separator" />,
          ]
    );
    setDropdownItems(nnsDropdownItems);
  }, [
    noobaaNamespaceStores,
    t,
    namespace,
    creatorDisabled,
    namespacePolicy,
    enabledItems,
    onChange,
    launchModal,
  ]);

  return (
    <div className={className}>
      {nnsLoadErr && (
        <Alert
          className="nb-create-bc-step-page--danger"
          variant="danger"
          isInline
          title={t('An error has occurred while fetching namespace stores')}
        />
      )}
      <Dropdown
        className="dropdown--full-width"
        toggle={
          <DropdownToggle
            id="nns-dropdown-id"
            isDisabled={
              !!nnsLoadErr ||
              (namespacePolicy === NamespacePolicyType.MULTI &&
                enabledItems?.length === 0)
            }
            data-test="nns-dropdown-toggle"
            onToggle={() => setOpen(!isOpen)}
          >
            {selectedKey || t('Select a namespace store')}
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

type NamespaceStoreDropdownProps = {
  id: string;
  namespace: string;
  onChange?: (NamespaceStoreKind) => void;
  className?: string;
  selectedKey: string;
  enabledItems?: string[];
  namespacePolicy?: NamespacePolicyType;
  creatorDisabled?: boolean;
  launchModal?: () => void;
};
