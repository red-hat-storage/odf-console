import * as React from 'react';

const PaneBody: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div data-test="mock-pane-body">{children}</div>
);

export default PaneBody;
