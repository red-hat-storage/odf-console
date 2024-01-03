import * as React from 'react';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
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
import '../../style.scss';

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

  // Operator install namespace is determined using Subscriptions, which non-admin can not access.
  // Using "true" in "useSafeK8sWatchResource" so that they can default to "openshift-storage" (if case of access issues),
  // which is current use case as well (as we do not officially support UI if ODF is installed in any other Namespace).
  // ToDo (Sanjal): Update the non-admin "Role" to a "ClusterRole", then read list of NamespaceStores across all namespaces.
  const [nnsData, , nnsLoadErr] = useSafeK8sWatchResource<NamespaceStoreKind[]>(
    namespaceStoreResource,
    true
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
