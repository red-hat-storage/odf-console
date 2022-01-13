import * as React from 'react';
import { LoadingInline } from '@odf/shared/generic/Loading';
import { K8sResourceCommon } from "@openshift-console/dynamic-plugin-sdk";
import * as _ from "lodash";
import { useTranslation } from 'react-i18next';
import { Select, SelectOption } from '@patternfly/react-core';

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
    onChange,
    selectedKey,
    id,
    resourceFilter,
    placeholderText,
    data,
    loaded,
    loadError,
    dataSelector,
    ...props
}) => {
    const { t } = useTranslation('plugin__odf-console');

    const [isOpen, setOpen] = React.useState(false);
    const [placeholder, setPlaceholder] = React.useState<React.ReactNode>(<LoadingInline />);
    const [selected, setSelected] = React.useState<string>("");
    const [items, setItems] = React.useState<JSX.Element[]>([]);
    
    React.useEffect(() => {
        if (loaded && !loadError) {
            setPlaceholder(placeholderText || t('Select options'));
            const filteredResource = resourceFilter ? data.filter((item) => resourceFilter(item)): data;
            setItems(filteredResource.map((item) => {
                const value = _.get(item, dataSelector);
                if (selectedKey && value === selectedKey) {
                    setSelected(selectedKey);
                    onChange(item);
                }
                return <SelectOption 
                    key={value}
                    value={value}
                />
            }));
        } else if (loadError) {
            setPlaceholder(
              <div className="cos-error-title">
                {t('Loading error')}
              </div>
            );
        }
       // resourceFilter & onChange are functions and its reference can change on every re-render of parent component
       // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, loaded, loadError, setPlaceholder, setSelected, selectedKey, t]);

    const onSelect = (event: React.MouseEvent | React.ChangeEvent, selection: string) => {
        setOpen(false);
        setSelected(selection);
        onChange(data.find((item) => _.get(item, dataSelector) === selection));
    };

    const onFilter = (_, textInput) => {
        if (textInput === "") return items;
        else return items?.filter((item) => item.props.value.toLowerCase().includes(textInput.toLowerCase()));
    };
    
    return (
        <>
            <Select
                {...props}
                aria-label={t('Select Resource')}
                onToggle={setOpen}
                onSelect={onSelect}
                onFilter={onFilter}
                selections={selected}
                isOpen={isOpen}
                placeholderText={placeholder}
                aria-labelledby={id}
                noResultsFoundText={t('No results found')}
                hasInlineFilter
                isGrouped
            >
                {items}
            </Select>
        </>
    );
};

export type FilterDropdownProps = {
    onChange: (item: any) => void;
    data: K8sResourceCommon[];
    loaded: boolean;
    loadError: any;
    dataSelector: string[] | number[] | symbol[];
    selectedKey?: string;
    placeholderText?: string;
    id?: string;
    resourceFilter?: (item: K8sResourceCommon) => boolean;
    className?: string;
};
