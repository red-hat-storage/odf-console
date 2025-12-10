import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import {
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Button,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
  MenuToggleElement,
  DatePicker,
  TimePicker,
  Tooltip,
} from '@patternfly/react-core';
import { getTodayDate } from './utils';
import './health-overview-filter-toolbox.scss';

type DateTimePickerProps = {
  dateValue?: string;
  timeValue?: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  dateAriaLabel: string;
  timeAriaLabel: string;
  datePlaceholder?: string;
  timePlaceholder?: string;
  tooltip?: string;
};

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  dateValue = '',
  timeValue = '',
  onDateChange,
  onTimeChange,
  dateAriaLabel,
  timeAriaLabel,
  datePlaceholder = 'YYYY-MM-DD',
  timePlaceholder = 'hh:mm AM/PM',
  tooltip = '',
}) => {
  const handleDateChange = (
    _event: React.FormEvent<HTMLInputElement>,
    date: string
  ) => {
    // If date is set but no time is set, automatically set time to 12:00 AM
    if (date && !timeValue) {
      onTimeChange('12:00 AM');
    }
    onDateChange(date);
  };

  const handleTimeChange = (
    _event: React.FormEvent<HTMLInputElement>,
    time: string
  ) => {
    // If time is set but no date is set, automatically set today's date
    if (time && !dateValue) {
      onDateChange(getTodayDate());
    }
    onTimeChange(time);
  };

  const dateTimeContent = (
    <div
      className="health-overview-filter-toolbox__datetime-group"
      style={{ display: 'inline-flex' }}
    >
      <ToolbarItem className="health-overview-filter-toolbox__datetime-item">
        <DatePicker
          key={`date-${dateValue}`}
          value={dateValue}
          onChange={handleDateChange}
          aria-label={dateAriaLabel}
          placeholder={datePlaceholder}
        />
      </ToolbarItem>
      <ToolbarItem className="health-overview-filter-toolbox__datetime-item">
        <TimePicker
          key={`time-${timeValue}`}
          time={timeValue}
          onChange={handleTimeChange}
          aria-label={timeAriaLabel}
          placeholder={timePlaceholder}
        />
      </ToolbarItem>
    </div>
  );

  return tooltip ? (
    <Tooltip content={tooltip}>{dateTimeContent}</Tooltip>
  ) : (
    dateTimeContent
  );
};

export type HealthOverviewFilterToolboxProps = {
  checkTypeFilter?: string;
  onCheckTypeFilterChange: (value: string) => void;
  startDate?: string;
  onStartDateChange: (value: string) => void;
  startTime?: string;
  onStartTimeChange: (value: string) => void;
  endDate?: string;
  onEndDateChange: (value: string) => void;
  endTime?: string;
  onEndTimeChange: (value: string) => void;
  searchValue?: string;
  onSearchChange: (value: string) => void;
  onSilenceClick: () => void;
  isSilenceEnabled?: boolean;
};

export const HealthOverviewFilterToolbox: React.FC<
  HealthOverviewFilterToolboxProps
> = ({
  checkTypeFilter = '',
  onCheckTypeFilterChange,
  startDate = '',
  onStartDateChange,
  startTime = '',
  onStartTimeChange,
  endDate = '',
  onEndDateChange,
  endTime = '',
  onEndTimeChange,
  searchValue = '',
  onSearchChange,
  onSilenceClick,
  isSilenceEnabled = false,
}) => {
  const { t } = useCustomTranslation();
  const [isCheckTypeOpen, setIsCheckTypeOpen] = React.useState(false);

  const checkTypeOptions = [
    { value: 'all', label: t('All checks') },
    { value: 'critical', label: t('Critical') },
    { value: 'moderate', label: t('Moderate') },
    { value: 'minor', label: t('Minor') },
  ];

  const onSelect = React.useCallback(
    (_event: React.MouseEvent | React.ChangeEvent, selection: string) => {
      onCheckTypeFilterChange(selection);
      setIsCheckTypeOpen(false);
    },
    [onCheckTypeFilterChange]
  );

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsCheckTypeOpen((prev) => !prev)}
      isExpanded={isCheckTypeOpen}
      className="health-overview-filter-toolbox__check-type-toggle"
    >
      {checkTypeOptions.find((opt) => opt.value === checkTypeFilter)?.label ||
        t('All checks')}
    </MenuToggle>
  );

  const handleClearAllFilters = React.useCallback(() => {
    onCheckTypeFilterChange('all');
    onStartDateChange('');
    onStartTimeChange('');
    onEndDateChange('');
    onEndTimeChange('');
    onSearchChange('');
  }, [
    onCheckTypeFilterChange,
    onStartDateChange,
    onStartTimeChange,
    onEndDateChange,
    onEndTimeChange,
    onSearchChange,
  ]);

  return (
    <Toolbar className="health-overview-filter-toolbox">
      <ToolbarContent>
        <div className="health-overview-filter-toolbox__severity-wrapper">
          <Tooltip content={t('Severity')}>
            <ToolbarItem className="health-overview-filter-toolbox__item">
              <Select
                isOpen={isCheckTypeOpen}
                selected={checkTypeFilter || 'all'}
                onSelect={onSelect}
                onOpenChange={(open) => setIsCheckTypeOpen(open)}
                toggle={toggle}
                shouldFocusFirstItemOnOpen
                shouldFocusToggleOnSelect
              >
                <SelectList>
                  {checkTypeOptions.map((option) => (
                    <SelectOption key={option.value} value={option.value}>
                      {option.label}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </ToolbarItem>
          </Tooltip>
          <Button
            variant="link"
            onClick={handleClearAllFilters}
            className="health-overview-filter-toolbox__clear-filters"
          >
            {t('Clear all filters')}
          </Button>
        </div>

        <DateTimePicker
          dateValue={startDate}
          timeValue={startTime}
          onDateChange={onStartDateChange}
          onTimeChange={onStartTimeChange}
          dateAriaLabel={t('Start date')}
          timeAriaLabel={t('Start time')}
          tooltip={t('Start date and time filter')}
        />

        <DateTimePicker
          dateValue={endDate}
          timeValue={endTime}
          onDateChange={onEndDateChange}
          onTimeChange={onEndTimeChange}
          dateAriaLabel={t('End date')}
          timeAriaLabel={t('End time')}
          tooltip={t('End date and time filter')}
        />

        <ToolbarItem className="health-overview-filter-toolbox__item health-overview-filter-toolbox__search">
          <SearchInput
            placeholder={t('Find by name or details')}
            value={searchValue}
            onChange={(_event, value) => onSearchChange(value)}
            onClear={() => onSearchChange('')}
            aria-label={t('Find by name or details')}
          />
        </ToolbarItem>

        <ToolbarItem className="health-overview-filter-toolbox__item">
          <Button
            variant="primary"
            onClick={onSilenceClick}
            isDisabled={!isSilenceEnabled}
          >
            {t('Silence')}
          </Button>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};
