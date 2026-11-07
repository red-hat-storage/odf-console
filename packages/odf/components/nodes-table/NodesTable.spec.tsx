import * as React from 'react';
import { NodeData } from '@odf/core/types';
import { Taint } from '@odf/shared/types';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { NodesTable } from './NodesTable';

// Override the globally-mocked (non-interpolating) translation hook so the
// "{{count}} taints" link renders with a real count.
jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      key.replace(/{{(\w+)}}/g, (_match, name) =>
        String(options?.[name] ?? '')
      ),
  }),
}));

const makeNode = (name: string, taints: Taint[] = []): NodeData =>
  ({
    apiVersion: 'v1',
    kind: 'Node',
    metadata: { name, uid: name, labels: {} },
    spec: { taints },
    status: { capacity: { cpu: '8', memory: '32Gi' } },
  }) as NodeData;

const renderTable = (showTaints?: boolean) =>
  render(
    <MemoryRouter>
      <NodesTable
        nodes={[
          makeNode('tainted-node', [
            { key: 'dedicated', value: 'storage', effect: 'NoSchedule' },
          ]),
          makeNode('plain-node'),
        ]}
        selectedNodes={[]}
        setSelectedNodes={jest.fn()}
        loaded
        showTaints={showTaints}
      />
    </MemoryRouter>
  );

describe('NodesTable showTaints', () => {
  it('renders the Taints column and per-node taints when showTaints is on', () => {
    renderTable(true);

    expect(
      screen.getByRole('columnheader', { name: 'Taints' })
    ).toBeInTheDocument();

    const taintedRow = screen.getByText('tainted-node').closest('tr');
    expect(
      within(taintedRow).getByRole('button', { name: '1 taints' })
    ).toBeInTheDocument();
  });

  it('omits the Taints column by default (protecting other consumers)', () => {
    renderTable();

    expect(
      screen.queryByRole('columnheader', { name: 'Taints' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /taints/ })
    ).not.toBeInTheDocument();
  });
});
