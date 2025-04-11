import * as React from 'react';
import {
  StorageSizeUnit,
  StorageSizeUnitName,
} from '@odf/shared/types/storage';
import { Screen, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CapacityAutoScaling } from './capacity-autoscaling';

type WrapperProps = {
  capacityLimit?: string;
  enable?: boolean;
  isEditView?: boolean;
  osdAmount?: number;
  osdSize?: string;
};

const Wrapper: React.FC<WrapperProps> = ({
  capacityLimit: limit = '',
  enable: enableFlag = false,
  isEditView,
  osdAmount = 3,
  osdSize = `2${StorageSizeUnit.Ti}`,
}) => {
  const [enable, setEnable] = React.useState(enableFlag);
  const [capacityLimit, setCapacityLimit] = React.useState<string>(limit);

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
      isEditView={isEditView}
      onChange={onChange}
      onLimitSelect={onLimitSelect}
      osdAmount={osdAmount}
      osdSize={osdSize}
    />
  );
};

const getCheckbox = (rtlScreen: Screen) =>
  rtlScreen.getByRole<HTMLInputElement>('checkbox', {
    name: /enable automatic capacity scaling for your cluster/i,
  });
const getAdditionalCostsAlert = (rtlScreen: Screen) =>
  rtlScreen.queryByText(
    /This may incur additional costs for the underlying storage./i
  );
const getAdditionalCostsLabel = (rtlScreen: Screen) =>
  rtlScreen.queryByText(/^incur additional costs$/i);
const getPopover = (rtlScreen: Screen) =>
  rtlScreen.queryByRole('dialog', {
    description:
      /Automatic capacity scaling adds capacity through OSD expansion by resizing existing OSDs or adding new OSDs to maintain node balance./i,
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
    expect(getAdditionalCostsLabel(screen)).not.toBeInTheDocument();
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
    expect(getAdditionalCostsLabel(screen)).not.toBeInTheDocument();
    expect(getTypeaheadDropdown(screen)).toBeVisible();
  });

  it('does not preselect any limit when enabled', () => {
    render(<Wrapper enable={true} />);

    expect(getTypeaheadDropdown(screen).value).toBeFalsy();
  });

  it('shows the limit selected by the user', async () => {
    const user = userEvent.setup();
    render(<Wrapper enable={true} />);

    const typeaheadDropdown = getTypeaheadDropdown(screen);
    await user.click(typeaheadDropdown);

    const option = screen.getByRole('option', {
      name: /^12 tib/i,
    });
    await user.click(option);

    expect(typeaheadDropdown.value).toBe(`12 ${StorageSizeUnitName.TiB}`);
  });

  it('shows additional costs label on edit view', () => {
    render(<Wrapper isEditView />);

    expect(getAdditionalCostsLabel(screen)).toBeVisible();
  });
});
