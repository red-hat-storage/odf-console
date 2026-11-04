import { DRStatus } from '@odf/mco/utils/dr-status';
import { NodeStatus } from '@patternfly/react-topology';
import { DecoratorIcon } from '../types';
import { getDecoratorForStatus } from './decorator-helpers';

describe('getDecoratorForStatus', () => {
  it.each([DRStatus.TestingFailover, DRStatus.TestFailoverPaused])(
    'shows %s as a running test',
    (drStatus) => {
      expect(getDecoratorForStatus(drStatus)).toEqual(
        expect.objectContaining({
          icon: DecoratorIcon.InProgress,
          tooltip: 'Preparing...',
          status: NodeStatus.info,
        })
      );
    }
  );

  it('shows the test hold as an informational user action', () => {
    expect(getDecoratorForStatus(DRStatus.TestFailoverActionRequired)).toEqual(
      expect.objectContaining({
        icon: DecoratorIcon.InfoCircle,
        tooltip: 'Action needed',
        status: NodeStatus.info,
      })
    );
  });
});
