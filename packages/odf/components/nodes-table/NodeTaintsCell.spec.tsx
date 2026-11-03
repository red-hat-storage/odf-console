import * as React from 'react';
import { NodeData } from '@odf/core/types';
import { Taint } from '@odf/shared/types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NodeTaintsCell } from './NodeTaintsCell';

// Override the globally-mocked (non-interpolating) translation hook so that
// interpolated/plural strings like "{{count}} taints" render with real values,
// letting us assert the taint count and node name.
jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      key.replace(/{{(\w+)}}/g, (_match, name) =>
        String(options?.[name] ?? '')
      ),
  }),
}));

const makeNode = (name: string, taints?: Taint[]): NodeData =>
  ({
    apiVersion: 'v1',
    kind: 'Node',
    metadata: { name, uid: name },
    spec: taints ? { taints } : {},
  }) as NodeData;

describe('NodeTaintsCell', () => {
  it('renders a dash and no link when the node has no taints', () => {
    render(<NodeTaintsCell node={makeNode('node-0')} />);

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a "{n} taints" link reflecting the taint count', () => {
    const node = makeNode('node-1', [
      { key: 'dedicated', value: 'storage', effect: 'NoSchedule' },
      {
        key: 'node.kubernetes.io/disk-pressure',
        value: '',
        effect: 'NoExecute',
      },
    ]);

    render(<NodeTaintsCell node={node} />);

    expect(
      screen.getByRole('button', { name: '2 taints' })
    ).toBeInTheDocument();
    // Popover content is not rendered until the link is clicked.
    expect(screen.queryByText('Taints on node-1')).not.toBeInTheDocument();
  });

  it('opens a popover listing each taint key/value/effect on click', async () => {
    const node = makeNode('node-6', [
      { key: 'dedicated', value: 'storage', effect: 'NoSchedule' },
    ]);

    render(<NodeTaintsCell node={node} />);

    await userEvent.click(screen.getByRole('button', { name: '1 taints' }));

    expect(screen.getByText('Taints on node-6')).toBeInTheDocument();
    expect(screen.getByText('Key')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getByText('Effect')).toBeInTheDocument();
    expect(screen.getByText('dedicated')).toBeInTheDocument();
    expect(screen.getByText('storage')).toBeInTheDocument();
    expect(screen.getByText('NoSchedule')).toBeInTheDocument();
  });

  it('renders the key and effect for a taint without a value', async () => {
    const node = makeNode('node-7', [
      {
        key: 'node.kubernetes.io/disk-pressure',
        value: '',
        effect: 'NoExecute',
      },
    ]);

    render(<NodeTaintsCell node={node} />);

    await userEvent.click(screen.getByRole('button', { name: '1 taints' }));

    expect(
      screen.getByText('node.kubernetes.io/disk-pressure')
    ).toBeInTheDocument();
    expect(screen.getByText('NoExecute')).toBeInTheDocument();
  });
});
