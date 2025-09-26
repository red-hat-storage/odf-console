import * as React from 'react';
import {
  Breakdown,
  Metrics,
  ServiceType,
  Groups,
  DataConsumption,
  defaultBreakdown,
} from '@odf/ocs/constants';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Select,
  SelectList,
  SelectOption,
  SelectGroup,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import './data-consumption-card.scss';

export const DataConsumptionDropdown: React.FC<DataConsumptionDropdownProps> = (
  props
) => {
  const {
    selectedService,
    setSelectedService,
    selectedBreakdown,
    setSelectedBreakdown,
    selectedMetric,
    setSelectedMetric,
    isRgwSupported,
    isMcgSupported,
  } = props;
  const { t } = useCustomTranslation();

  const [isOpenComboDropdown, setComboDropdown] = React.useState(false);
  const [isOpenServiceTypeDropdown, setServiceTypeDropdown] =
    React.useState(false);

  const MCGDropdown = React.useMemo(
    () => [
      {
        group: t('Break by'),
        items: [
          { id: Breakdown.PROVIDERS, name: t('Providers') },
          { id: Breakdown.ACCOUNTS, name: t('Accounts') },
        ],
      },
      {
        group: t('Metric'),
        items: [
          { name: t('I/O Operations'), id: Metrics.IOPS },
          ...(selectedBreakdown === Breakdown.ACCOUNTS
            ? [{ name: t('Logical Used Capacity'), id: Metrics.LOGICAL }]
            : [
                {
                  name: t('Physical vs. Logical used capacity'),
                  id: Metrics.PHY_VS_LOG,
                },
              ]),
          ...(selectedBreakdown === Breakdown.PROVIDERS
            ? [{ name: t('Egress'), id: Metrics.EGRESS }]
            : []),
        ],
      },
    ],
    [selectedBreakdown, t]
  );

  const RGWDropdown = [
    {
      group: t('Metric'),
      items: [
        { name: t('Latency'), id: Metrics.LATENCY },
        { name: t('Bandwidth'), id: Metrics.BANDWIDTH },
      ],
    },
  ];

  const ServiceTypeDropdown = [
    {
      group: t('Service Type'),
      items: [
        { name: ServiceType.MCG, id: ServiceType.MCG },
        { name: ServiceType.RGW, id: ServiceType.RGW },
      ],
    },
  ];

  const onSelectComboDropdown = (
    _event: React.MouseEvent | undefined,
    value: string | number | undefined
  ) => {
    const id = value as string;
    const isBreakdown = id === Breakdown.ACCOUNTS || id === Breakdown.PROVIDERS;
    const breakdownBy = isBreakdown ? Groups.BREAKDOWN : Groups.METRIC;

    if (breakdownBy === Groups.BREAKDOWN) {
      setSelectedBreakdown(id as Breakdown);
      setSelectedMetric(DataConsumption.defaultMetrics[selectedService]);
    } else {
      setSelectedMetric(id as Metrics);
    }
  };

  const onSelectServiceDropdown = (
    _e: React.MouseEvent | undefined,
    value: string | number | undefined
  ) => {
    const selection = value as ServiceType;
    setSelectedService(selection);
    setSelectedMetric(DataConsumption.defaultMetrics[selection]);
    if (selection === ServiceType.MCG) {
      setSelectedBreakdown(defaultBreakdown[ServiceType.MCG]);
    } else {
      setSelectedBreakdown(null);
    }
  };

  // ---------- ITEMS ----------
  const comboDropdownItems = (
    <SelectList className="nb-dat a-consumption-card__dropdown-item nb-data-consumption-card__options-menu">
      {(selectedService === ServiceType.MCG ? MCGDropdown : RGWDropdown).map(
        (group) => (
          <SelectGroup key={group.group} label={group.group}>
            {group.items.map((item) => {
              const isSelected =
                item.id === selectedBreakdown || item.id === selectedMetric;
              return (
                <SelectOption
                  key={item.id}
                  value={item.id}
                  isSelected={isSelected}
                >
                  {item.name}
                </SelectOption>
              );
            })}
          </SelectGroup>
        )
      )}
    </SelectList>
  );

  const serviceDropdownItems = (
    <SelectList className="nb-data-consumption-card__dropdown-item nb-data-consumption-card__options-menu">
      {ServiceTypeDropdown.map((group) => (
        <SelectGroup key={group.group} label={group.group}>
          {group.items.map((item) => (
            <SelectOption
              key={item.id}
              value={item.id}
              isSelected={item.id === selectedService}
            >
              {item.name}
            </SelectOption>
          ))}
        </SelectGroup>
      ))}
    </SelectList>
  );

  const comboToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      className="nb-data-consumption-card__dropdown-item nb-data-consumption-card__options-menu"
      ref={toggleRef}
      onClick={() => setComboDropdown(!isOpenComboDropdown)}
      isExpanded={isOpenComboDropdown}
      style={{
        width: '170px',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      {selectedBreakdown
        ? t('{{selectedMetric}} by {{selectedBreakdown}}', {
            selectedMetric,
            selectedBreakdown,
          })
        : selectedMetric}
    </MenuToggle>
  );

  const serviceToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      className="nb-data-consumption-card__dropdown-item nb-data-consumption-card__options-menu"
      ref={toggleRef}
      onClick={() => setServiceTypeDropdown(!isOpenServiceTypeDropdown)}
      isExpanded={isOpenServiceTypeDropdown}
    >
      {t('Type: {{selectedService}}', { selectedService })}
    </MenuToggle>
  );

  return (
    <div className="nb-data-consumption-card__dropdown">
      {isRgwSupported && isMcgSupported && (
        <Select
          isOpen={isOpenServiceTypeDropdown}
          onSelect={onSelectServiceDropdown}
          onOpenChange={setServiceTypeDropdown}
          toggle={serviceToggle}
          className="nb-data-consumption-card__dropdown-item nb-data-consumption-card__dropdown-item--margin"
          selectPopperProps={{
            position: 'right-start',
            enableFlip: false,
          }}
        >
          {serviceDropdownItems}
        </Select>
      )}

      <Select
        isOpen={isOpenComboDropdown}
        onSelect={onSelectComboDropdown}
        onOpenChange={setComboDropdown}
        toggle={comboToggle}
        selectPopperProps={{
          position: 'right-start',
          enableFlip: false,
        }}
      >
        {comboDropdownItems}
      </Select>
    </div>
  );
};

type DataConsumptionDropdownProps = {
  selectedService: ServiceType;
  setSelectedService: React.Dispatch<React.SetStateAction<ServiceType>>;
  selectedBreakdown: Breakdown;
  setSelectedBreakdown: React.Dispatch<React.SetStateAction<Breakdown>>;
  selectedMetric: Metrics;
  setSelectedMetric: React.Dispatch<React.SetStateAction<Metrics>>;
  isRgwSupported: boolean;
  isMcgSupported: boolean;
};
