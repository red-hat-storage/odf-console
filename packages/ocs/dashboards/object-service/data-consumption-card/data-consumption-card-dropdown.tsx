import * as React from 'react';
import {
  Breakdown,
  Metrics,
  ServiceType,
  Groups,
  DataConsumption,
  defaultBreakdown,
} from '@odf/ocs/constants';
import {
  getOptionsMenuItems,
  getGroupedSelectOptions,
} from '@odf/shared/dashboards/breakdown-card/breakdown-dropdown';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { MenuToggle, MenuToggleElement, Select } from '@patternfly/react-core';
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

  const onSelectComboDropdown = (e: React.MouseEvent) => {
    const { id } = e.currentTarget;
    const isBreakdown = id === Breakdown.ACCOUNTS || id === Breakdown.PROVIDERS;
    const breakdownBy = isBreakdown ? Groups.BREAKDOWN : Groups.METRIC;
    switch (breakdownBy) {
      case Groups.BREAKDOWN:
        setSelectedBreakdown(id as Breakdown);
        setSelectedMetric(DataConsumption.defaultMetrics[selectedService]);
        break;
      case Groups.METRIC:
        setSelectedMetric(id as Metrics);
        break;
      default:
        break;
    }
    if (selectedService !== ServiceType.MCG) {
      setComboDropdown(!isOpenComboDropdown);
    }
  };

  const onSelectServiceDropdown = (
    _e: React.MouseEvent,
    selection: ServiceType
  ) => {
    setSelectedService(selection);
    setSelectedMetric(DataConsumption.defaultMetrics[selection]);
    if (selection === ServiceType.MCG) {
      setSelectedBreakdown(defaultBreakdown[ServiceType.MCG]);
    } else {
      setSelectedBreakdown(null);
    }
    setServiceTypeDropdown(!isOpenServiceTypeDropdown);
  };

  const comboDropdownItems = (() => {
    const dropdown =
      selectedService === ServiceType.MCG ? MCGDropdown : RGWDropdown;
    return getOptionsMenuItems(dropdown, [selectedBreakdown, selectedMetric]);
  })();

  const serviceDropdownItems = getGroupedSelectOptions(ServiceTypeDropdown);

  const comboToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setComboDropdown(!isOpenComboDropdown)}
      isExpanded={isOpenComboDropdown}
      className="nb-data-consumption-card__dropdown-item nb-data-consumption-card__options-menu"
    >
      {selectedBreakdown
        ? t('{{selectedMetric}} by {{selectedBreakdown}}', {
            selectedMetric,
            selectedBreakdown,
          })
        : selectedMetric}
    </MenuToggle>
  );

  const serviceTypeToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setServiceTypeDropdown(!isOpenServiceTypeDropdown)}
      isExpanded={isOpenServiceTypeDropdown}
      className="nb-data-consumption-card__dropdown-item--margin nb-data-consumption-card__dropdown-item"
    >
      {selectedService
        ? t('Type: {{selectedService}}', { selectedService })
        : t('Select Service Type')}
    </MenuToggle>
  );

  return (
    <div className="nb-data-consumption-card__dropdown">
      {isRgwSupported && isMcgSupported && (
        <Select
          id="service-type-select"
          isOpen={isOpenServiceTypeDropdown}
          onOpenChange={setServiceTypeDropdown}
          onSelect={onSelectServiceDropdown}
          selected={selectedService}
          toggle={serviceTypeToggle}
          aria-label={t('Break By Dropdown')}
        >
          {serviceDropdownItems}
        </Select>
      )}
      <Select
        id="breakdown-options"
        isOpen={isOpenComboDropdown}
        onSelect={onSelectComboDropdown}
        toggle={comboToggle}
        onOpenChange={setComboDropdown}
        popperProps={{
          position: 'right',
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
