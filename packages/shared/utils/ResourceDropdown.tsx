import * as React from 'react';
import {
  useK8sWatchResource,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk-internal-kubevirt/lib/api/common-types';
import classNames from 'classnames';
import * as fuzzy from 'fuzzysearch';
import { useTranslation } from 'react-i18next';
import {
  Dropdown,
  DropdownItem,
  DropdownToggle,
  TextInput,
} from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';
import { LoadingInline } from '../generic/Loading';
import { getName, getUID } from '../selectors';
import './resourceDropdown.scss';

const filterName = (searchText: string, resourceName: string) =>
  fuzzy(searchText, resourceName);

type ResourceBadgeProps = {
  model: K8sModel;
};

const ResourceBadge: React.FC<ResourceBadgeProps> = ({
  model: resourceModel,
}) => (
  <>
    <span className="sr-only">{resourceModel.abbr.toLocaleUpperCase()}</span>
    <span className="co-m-resource-icon" title={resourceModel.kind}>
      {resourceModel.abbr.toLocaleUpperCase()}
    </span>
  </>
);

type ResourceDropdownItemProps<T> = {
  resource: T;
  resourceModel: K8sModel;
  id: string;
  propertySelector?: (resource: T) => string;
  showBadge?: boolean;
  secondaryTextGenerator?: (resource: T) => string;
  onClick?: any;
};

type ResourceDropdownItem = <T>(
  props: ResourceDropdownItemProps<T>
) => ReturnType<React.FC>;

const ResourceDropdownItem: ResourceDropdownItem = ({
  resourceModel: model,
  resource,
  propertySelector,
  showBadge = true,
  id,
  secondaryTextGenerator,
  onClick,
}) => {
  return (
    <DropdownItem id={id} onClick={onClick}>
      <div>
        <span className="co-resource-item">
          {showBadge && <ResourceBadge model={model} />}
          {propertySelector(resource)}
        </span>
      </div>
      {secondaryTextGenerator && (
        <div>
          <span className="text-muted">{secondaryTextGenerator(resource)}</span>
        </div>
      )}
    </DropdownItem>
  );
};

type ResourceDropdownTextProps = {
  showBadge?: boolean;
  resourceModel?: K8sModel;
  text: string;
};

const ResourceDropdownText: React.FC<ResourceDropdownTextProps> = ({
  showBadge = true,
  resourceModel,
  text,
}) => (
  <span>
    {text && showBadge && <ResourceBadge model={resourceModel} />}
    {text}
  </span>
);

type ResourceDropdownProps<T> = {
  resource: WatchK8sResource;
  resourceModel: K8sModel;
  onSelect: (resource: T) => void;
  secondaryTextGenerator: (resource: T) => string;
  propertySelector?: (resource: T) => string;
  showBadge?: boolean;
  className?: string;
  initialSelection?: (resource: T[]) => T;
  filterResource?: (resource: T) => boolean;
};

type ResourceDropdown = <T>(
  props: React.PropsWithChildren<ResourceDropdownProps<T>>
) => ReturnType<React.FC>;

const ResourceDropdown: ResourceDropdown = <T extends unknown>({
  resource: watchResource,
  resourceModel,
  showBadge,
  propertySelector = getName,
  onSelect,
  secondaryTextGenerator,
  className,
  initialSelection,
  filterResource,
}) => {
  const [isOpen, setOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [searchText, setSearchText] = React.useState('');

  const { t } = useTranslation('plugin__odf-console');

  const [resources, loaded, loadError] =
    useK8sWatchResource<T[]>(watchResource);

  React.useEffect(() => {
    if (initialSelection && selectedItem === null && loaded && !loadError) {
      const item = initialSelection(resources);
      onSelect(item);
      setSelectedItem(item);
    }
  }, [
    selectedItem,
    initialSelection,
    setSelectedItem,
    loaded,
    loadError,
    resources,
    onSelect,
  ]);

  const onClick = React.useCallback(
    (event: React.SyntheticEvent<HTMLDivElement>) => {
      const resourceUID = event?.currentTarget?.id;
      const selectedResource = resources.find(
        (resource) => getUID(resource) === resourceUID
      );
      onSelect(selectedResource);
      setSelectedItem(selectedResource);
      setOpen(false);
    },
    [onSelect, setSelectedItem, resources]
  );

  const dropdownItems = React.useMemo(() => {
    if (!loaded && loadError) {
      return [];
    } else {
      return resources
        .filter(
          (res) =>
            filterName(searchText, getName(res)) &&
            (filterResource ? filterResource(res) : true)
        )
        .reduce((acc, curr) => {
          return [
            ...acc,
            <ResourceDropdownItem<T>
              key={propertySelector(curr)}
              resourceModel={resourceModel}
              showBadge={showBadge}
              resource={curr}
              id={getUID(curr)}
              propertySelector={propertySelector}
              secondaryTextGenerator={secondaryTextGenerator}
              onClick={onClick}
            />,
          ];
        }, []);
    }
  }, [
    resources,
    loaded,
    loadError,
    resourceModel,
    showBadge,
    propertySelector,
    secondaryTextGenerator,
    onClick,
    searchText,
    filterResource,
  ]);

  const onToggle = () => {
    setOpen((o) => !o);
    setSearchText('');
  };

  return (
    <Dropdown
      className={classNames('odf-resourceDropdown__container', className)}
      toggle={
        <DropdownToggle
          onToggle={loaded && !loadError ? onToggle : () => {}}
          toggleIndicator={CaretDownIcon}
        >
          {!loaded && <LoadingInline />}
          {loaded && !loadError && (
            <ResourceDropdownText
              text={selectedItem ? propertySelector(selectedItem) : ''}
              resourceModel={resourceModel}
              showBadge={showBadge}
            />
          )}
          {loaded && loadError && (
            <span className="odf-resourceDropdownContainer__toggle--error">
              {t('Error Loading')}
            </span>
          )}
        </DropdownToggle>
      }
      isOpen={isOpen}
    >
      <TextInput
        id="search-bar"
        iconVariant="search"
        value={searchText}
        onChange={(val) => setSearchText(val)}
        autoComplete="off"
      />
      {dropdownItems}
    </Dropdown>
  );
};

export default ResourceDropdown;
