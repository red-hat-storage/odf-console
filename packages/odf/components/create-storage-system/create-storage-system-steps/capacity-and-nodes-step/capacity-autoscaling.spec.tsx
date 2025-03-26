import * as React from 'react';
import { CAPACITY_AUTOSCALING_MAX_LIMIT_IN_TIB } from '@odf/shared/constants';
import {
  StorageSizeUnit,
  StorageSizeUnitName,
} from '@odf/shared/types/storage';
import { getCapacityAutoScalingDefaultLimit } from '@odf/shared/utils/storage';
import { Screen, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CapacityAutoScaling } from './capacity-autoscaling';

const Wrapper: React.FC = () => {
  const [enable, setEnable] = React.useState(false);
  const [capacityLimit, setCapacityLimit] = React.useState(
    getCapacityAutoScalingDefaultLimit()
  );

  const onChange = (_, checked) => {
    setEnable(checked);
  };

  const onLimitSelect = (selected) => {
    setCapacityLimit(selected);
  };

  return (
    <CapacityAutoScaling
      capacityLimit={capacityLimit}
      enable={enable}
      onChange={onChange}
      onLimitSelect={onLimitSelect}
      osdAmount={3}
      osdSize={`2${StorageSizeUnit.Ti}`}
    />
  );
};

const getCheckbox = (rtlScreen: Screen) =>
  rtlScreen.getByRole<HTMLInputElement>('checkbox', {
    name: /enable smart capacity scaling for your cluster/i,
  });
const getAdditionalCostsAlert = (rtlScreen: Screen) =>
  rtlScreen.queryByText(
    /This may incur additional costs for the underlying storage./i
  );
const getPopover = (rtlScreen: Screen) =>
  rtlScreen.queryByRole('dialog', {
    description:
      /Smart scaling adds capacity through OSD expansion by resizing existing OSDs or adding new OSDs to maintain node balance./i,
  });
const getTypeaheadDropdown = (rtlScreen: Screen) =>
  rtlScreen.queryByRole<HTMLInputElement>('combobox', {
    name: /type to filter/i,
  });

describe('Capacity Autoscaling', () => {
  it('shows disabled checkbox', () => {
    render(<Wrapper />);

    expect(getCheckbox(screen)).not.toBeChecked();
    expect(getAdditionalCostsAlert(screen)).not.toBeInTheDocument();
    expect(getTypeaheadDropdown(screen)).not.toBeInTheDocument();
  });

  it('shows description popover on description link click', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    expect(getPopover(screen)).not.toBeInTheDocument();

    const link = screen.getByRole('button', {
      name: /how does it work?/i,
    });
    await user.click(link);

    expect(getPopover(screen)).toBeVisible();
  });

  it('shows enabled checkbox (and required elements) on check', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const checkbox = getCheckbox(screen);
    await user.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(getAdditionalCostsAlert(screen)).toBeVisible();
    expect(getTypeaheadDropdown(screen).value).toBe(
      `${CAPACITY_AUTOSCALING_MAX_LIMIT_IN_TIB} ${StorageSizeUnitName.TiB}`
    );
  });

  it('shows the selected option on capacity limit select', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(getCheckbox(screen));
    const typeaheadDropdown = getTypeaheadDropdown(screen);
    await user.click(typeaheadDropdown);

    const option = screen.getByRole('option', {
      name: /^12 tib/i,
    });
    await user.click(option);
    expect(typeaheadDropdown.value).toBe(`12 ${StorageSizeUnitName.TiB}`);
  });
});
