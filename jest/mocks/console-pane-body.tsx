import * as React from 'react';

/** Stand-in for @console/shared PaneBody used by SDK ListPageBody in Jest. */
const PaneBody: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div data-test-id="mock-console-pane-body">{children}</div>
);

export default PaneBody;
