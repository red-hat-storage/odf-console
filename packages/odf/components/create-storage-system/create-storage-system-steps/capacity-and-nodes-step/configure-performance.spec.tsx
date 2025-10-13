import * as React from 'react';
import { createWizardNodeState } from '@odf/core/components/utils';
import { useNodesData } from '@odf/core/hooks';
import { ResourceProfile } from '@odf/core/types';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createFakeNodesData } from '../../../../../../jest/helpers';
import ConfigurePerformance, {
  ProfileRequirementsText,
} from './configure-performance';

jest.mock('@odf/core/hooks', () => ({
  useNodesData: jest.fn(),
}));

const onResourceProfileChange = jest.fn();

const errorIconSelector = '[class$="select__toggle-status-icon"]';

describe('Configure Performance', () => {
  beforeEach(() => {
    onResourceProfileChange.mockClear();
  });

  it('renders default profile and selects Performance profile', async () => {
    const cpu = 12;
    const memory = 32 * 1000 * 1000 * 1000;
    const nodes = createFakeNodesData(3, cpu, memory);
    const selectedNodes = createWizardNodeState(nodes);
    (useNodesData as jest.Mock).mockReturnValueOnce([nodes, true, null]);

    const user = userEvent.setup();
    const { container } = render(
      <ConfigurePerformance
        onResourceProfileChange={onResourceProfileChange}
        resourceProfile={ResourceProfile.Balanced}
        selectedNodes={selectedNodes}
      />
    );

    const dropdown = screen.getByRole('button', {
      name: /options menu/i,
    });
    expect(dropdown).toHaveTextContent('Balanced mode');

    const errorIcon = container.querySelector(errorIconSelector);
    expect(errorIcon).toBeFalsy();

    await user.click(dropdown);
    const performanceOption = screen.getByRole('option', {
      name: /performance mode cpus required/i,
    });
    await user.click(performanceOption);
    expect(onResourceProfileChange).toHaveBeenNthCalledWith(
      1,
      ResourceProfile.Performance
    );
  });

  it('forces Lean when selectable nodes do not allow higher profiles', () => {
    (useNodesData as jest.Mock).mockReturnValueOnce([[], true, null]);

    render(
      <ConfigurePerformance
        onResourceProfileChange={onResourceProfileChange}
        resourceProfile={ResourceProfile.Balanced}
        selectedNodes={[]}
      />
    );
    expect(onResourceProfileChange).toHaveBeenNthCalledWith(
      1,
      ResourceProfile.Lean
    );
  });

  it('shows error icon in the dropdown when resource requirements are not enough', () => {
    const cpu = 12;
    const memory = 32 * 1000 * 1000 * 1000;
    const nodes = createFakeNodesData(3, cpu, memory);
    const selectedNodes = createWizardNodeState(nodes);
    (useNodesData as jest.Mock).mockReturnValueOnce([nodes, true, null]);

    const { container } = render(
      <ConfigurePerformance
        onResourceProfileChange={onResourceProfileChange}
        resourceProfile={ResourceProfile.Performance}
        selectedNodes={selectedNodes}
      />
    );
    const dropdown = screen.getByRole('button', {
      name: /options menu/i,
    });
    expect(dropdown).toHaveTextContent('Performance mode');

    const errorIcon = container.querySelector(errorIconSelector);
    expect(errorIcon).toBeVisible();
    expect(onResourceProfileChange).toHaveBeenCalledTimes(0);
  });

  it('shows higher resource requirements due to high amount of OSDs', () => {
    const cpu = 12;
    const memory = 32 * 1000 * 1000 * 1000;
    const nodes = createFakeNodesData(3, cpu, memory);
    const selectedNodes = createWizardNodeState(nodes);
    (useNodesData as jest.Mock).mockReturnValueOnce([nodes, true, null]);

    render(
      <ConfigurePerformance
        onResourceProfileChange={onResourceProfileChange}
        resourceProfile={ResourceProfile.Balanced}
        selectedNodes={selectedNodes}
        osdAmount={9}
        profileRequirementsText={ProfileRequirementsText}
      />
    );

    const dropdown = screen.getByRole('button', {
      name: /options menu/i,
    });
    expect(dropdown).toHaveTextContent('Balanced mode');
    expect(screen.getByText(/42 CPUs/i)).toBeInTheDocument();
    expect(screen.getByText(/102 GiB/i)).toBeInTheDocument();
  });

  it('shows correct resource requirements for s390x Lean profile', () => {
    const cpu = 20;
    const memory = 40 * 1000 * 1000 * 1000;
    const nodes = createFakeNodesData(3, cpu, memory);
    nodes.forEach((node) => {
      node.status.nodeInfo = { architecture: 's390x' };
    });
    const selectedNodes = createWizardNodeState(nodes);
    (useNodesData as jest.Mock).mockReturnValueOnce([nodes, true, null]);

    render(
      <ConfigurePerformance
        onResourceProfileChange={onResourceProfileChange}
        resourceProfile={ResourceProfile.Lean}
        selectedNodes={selectedNodes}
        profileRequirementsText={ProfileRequirementsText}
      />
    );

    expect(screen.getByText(/15 CPUs/i)).toBeInTheDocument();
    expect(screen.getByText(/72 GiB/i)).toBeInTheDocument();
  });

  it('shows correct resource requirements for s390x Balanced profile', () => {
    const cpu = 25;
    const memory = 80 * 1000 * 1000 * 1000;
    const nodes = createFakeNodesData(3, cpu, memory);
    nodes.forEach((node) => {
      node.status.nodeInfo = { architecture: 's390x' };
    });
    const selectedNodes = createWizardNodeState(nodes);
    (useNodesData as jest.Mock).mockReturnValueOnce([nodes, true, null]);

    render(
      <ConfigurePerformance
        onResourceProfileChange={onResourceProfileChange}
        resourceProfile={ResourceProfile.Balanced}
        selectedNodes={selectedNodes}
        profileRequirementsText={ProfileRequirementsText}
      />
    );

    expect(screen.getByText(/18 CPUs/i)).toBeInTheDocument();
    expect(screen.getByText(/72 GiB/i)).toBeInTheDocument();
  });

  it('shows correct resource requirements for s390x Performance profile', () => {
    const cpu = 35;
    const memory = 150 * 1000 * 1000 * 1000;
    const nodes = createFakeNodesData(3, cpu, memory);
    nodes.forEach((node) => {
      node.status.nodeInfo = { architecture: 's390x' };
    });
    const selectedNodes = createWizardNodeState(nodes);
    (useNodesData as jest.Mock).mockReturnValueOnce([nodes, true, null]);

    render(
      <ConfigurePerformance
        onResourceProfileChange={onResourceProfileChange}
        resourceProfile={ResourceProfile.Performance}
        selectedNodes={selectedNodes}
        profileRequirementsText={ProfileRequirementsText}
      />
    );

    expect(screen.getByText(/27 CPUs/i)).toBeInTheDocument();
    expect(screen.getByText(/96 GiB/i)).toBeInTheDocument();
  });

  it('calculates extra OSD requirements correctly for s390x', () => {
    const cpu = 30;
    const memory = 100 * 1000 * 1000 * 1000;
    const nodes = createFakeNodesData(3, cpu, memory);
    nodes.forEach((node) => {
      node.status.nodeInfo = { architecture: 's390x' };
    });
    const selectedNodes = createWizardNodeState(nodes);
    (useNodesData as jest.Mock).mockReturnValueOnce([nodes, true, null]);

    render(
      <ConfigurePerformance
        onResourceProfileChange={onResourceProfileChange}
        resourceProfile={ResourceProfile.Balanced}
        selectedNodes={selectedNodes}
        osdAmount={9} // 9 OSDs instead of default 3
        profileRequirementsText={ProfileRequirementsText}
      />
    );

    expect(screen.getByText(/24 CPUs/i)).toBeInTheDocument();
    expect(screen.getByText(/102 GiB/i)).toBeInTheDocument();
  });
});
