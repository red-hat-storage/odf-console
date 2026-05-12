import * as React from 'react';

type Props = {
  children?: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: unknown): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // hide the error-ed component(s) without breaking the whole page
      return null;
    }

    return this.props.children;
  }
}
