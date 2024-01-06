import * as React from 'react';
import { createWizardNodeState } from '@odf/core/components/utils';
import { ResourceProfile } from '@odf/core/types';
import { NodeKind } from '@odf/shared/types';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk/lib/api/dynamic-core-api';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ConfigurePerformance from './configure-performance';

jest.mock(
  '@openshift-console/dynamic-plugin-sdk/lib/api/dynamic-core-api',
  () => ({
    useK8sWatchResource: jest.fn(),
  })
);

jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({
    t: jest.fn(),
  }),
}));
const onResourceProfileChange = jest.fn();

const createFakeNodes = (
  amount: number,
  cpu: number,
  memory: string
): NodeKind[] =>
  Array.from(
    Array(amount),
    (): NodeKind => ({
      status: { capacity: { cpu: cpu }, allocatable: { memory: memory } },
      metadata: {},
    })
  );
const errorIconSelector = '[class$="select__toggle-status-icon"]';

describe('Configure Performance', () => {
  beforeEach(() => {
    onResourceProfileChange.mockClear();
  });

  it('renders default profile and selects Performance profile', async () => {
    const cpu = 12;
    const memory = String(32 * 1000 * 1000 * 1000);
    const nodes: NodeKind[] = createFakeNodes(3, cpu, memory);
    const selectedNodes = createWizardNodeState(nodes);
    (useK8sWatchResource as jest.Mock).mockReturnValueOnce([nodes, true, null]);

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
    expect(dropdown).toHaveTextContent('balanced');

    const errorIcon = container.querySelector(errorIconSelector);
    expect(errorIcon).toBeFalsy();

    await user.click(dropdown);
    const performanceOption = screen.getByRole('option', {
      name: /performance cpus required/i,
    });
    await user.click(performanceOption);
    expect(onResourceProfileChange).toHaveBeenNthCalledWith(
      1,
      ResourceProfile.Performance
    );
  });

  it('forces Lean when selectable nodes do not allow higher profiles', () => {
    (useK8sWatchResource as jest.Mock).mockReturnValueOnce([[], true, null]);

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
    const memory = String(32 * 1000 * 1000 * 1000);
    const nodes: NodeKind[] = createFakeNodes(3, cpu, memory);
    const selectedNodes = createWizardNodeState(nodes);
    (useK8sWatchResource as jest.Mock).mockReturnValueOnce([nodes, true, null]);

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
    expect(dropdown).toHaveTextContent('performance');

    const errorIcon = container.querySelector(errorIconSelector);
    expect(errorIcon).toBeVisible();
    expect(onResourceProfileChange).toHaveBeenCalledTimes(0);
  });
});
