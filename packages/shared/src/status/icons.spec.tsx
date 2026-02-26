import * as React from 'react';
import { configure, render } from '@testing-library/react';
import {
  BlueArrowCircleUpIcon,
  BlueInfoCircleIcon,
  BlueSyncIcon,
  GrayUnknownIcon,
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  RedResourcesFullIcon,
  YellowExclamationTriangleIcon,
  YellowResourcesAlmostFullIcon,
} from './icons';

configure({ testIdAttribute: 'data-testid' });

const mockCheckCircleIcon = jest.fn((props) => (
  <span data-testid="mock-check-circle-icon" {...props} />
));

const mockExclamationCircleIcon = jest.fn((props) => (
  <span data-testid="mock-exclamation-circle-icon" {...props} />
));

const mockExclamationTriangleIcon = jest.fn((props) => (
  <span data-testid="mock-exclamation-triangle-icon" {...props} />
));

const mockInfoCircleIcon = jest.fn((props) => (
  <span data-testid="mock-info-circle-icon" {...props} />
));

const mockUnknownIcon = jest.fn((props) => (
  <span data-testid="mock-unknown-icon" {...props} />
));

const mockSyncAltIcon = jest.fn((props) => (
  <span data-testid="mock-sync-alt-icon" {...props} />
));

const mockResourcesFullIcon = jest.fn((props) => (
  <span data-testid="mock-resources-full-icon" {...props} />
));

const mockResourcesAlmostFullIcon = jest.fn((props) => (
  <span data-testid="mock-resources-almost-full-icon" {...props} />
));

const mockArrowCircleUpIcon = jest.fn((props) => (
  <span data-testid="mock-arrow-circle-up-icon" {...props} />
));

jest.mock('@patternfly/react-icons', () => ({
  CheckCircleIcon: (props) => mockCheckCircleIcon(props),
  ExclamationCircleIcon: (props) => mockExclamationCircleIcon(props),
  ExclamationTriangleIcon: (props) => mockExclamationTriangleIcon(props),
  InfoCircleIcon: (props) => mockInfoCircleIcon(props),
  UnknownIcon: (props) => mockUnknownIcon(props),
  SyncAltIcon: (props) => mockSyncAltIcon(props),
  ResourcesFullIcon: (props) => mockResourcesFullIcon(props),
  ResourcesAlmostFullIcon: (props) => mockResourcesAlmostFullIcon(props),
  ArrowCircleUpIcon: (props) => mockArrowCircleUpIcon(props),
}));

describe('GreenCheckCircleIcon', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the green check circle icon', () => {
    const { getByTestId } = render(<GreenCheckCircleIcon />);
    const icon = getByTestId('mock-check-circle-icon');

    expect(icon).toBeInTheDocument();
  });

  it('should render a green check circle icon in green color', () => {
    const { getByTestId } = render(<GreenCheckCircleIcon />);
    const icon = getByTestId('mock-check-circle-icon');

    expect(icon).toHaveAttribute('color', '#3d7317');
  });

  it('renders a green check circle icon with custom classnames and title', () => {
    render(<GreenCheckCircleIcon title="custom" className="custom" />);

    expect(mockCheckCircleIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'custom',
        className: 'custom',
      })
    );
  });
});

describe('RedExclamationCircleIcon', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the red exclamation circle icon', () => {
    const { getByTestId } = render(<RedExclamationCircleIcon />);
    const icon = getByTestId('mock-exclamation-circle-icon');

    expect(icon).toBeInTheDocument();
  });

  it('should render a red exclamation circle icon in red color', () => {
    const { getByTestId } = render(<RedExclamationCircleIcon />);
    const icon = getByTestId('mock-exclamation-circle-icon');

    expect(icon).toHaveAttribute('color', '#b1380b');
  });

  it('renders a red exclamation circle icon with custom classnames and title', () => {
    render(<RedExclamationCircleIcon title="custom" className="custom" />);

    expect(mockExclamationCircleIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'custom',
        className: 'custom',
      })
    );
  });
});

describe('YellowExclamationTriangleIcon', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the yellow exclamation triangle icon', () => {
    const { getByTestId } = render(<YellowExclamationTriangleIcon />);
    const icon = getByTestId('mock-exclamation-triangle-icon');

    expect(icon).toBeInTheDocument();
  });

  it('should render a yellow exclamation triangle icon in yellow color', () => {
    const { getByTestId } = render(<YellowExclamationTriangleIcon />);
    const icon = getByTestId('mock-exclamation-triangle-icon');

    expect(icon).toHaveAttribute('color', '#73480b');
  });

  it('renders a yellow exclamation triangle icon with custom classnames and title', () => {
    render(<YellowExclamationTriangleIcon title="custom" className="custom" />);

    expect(mockExclamationTriangleIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'custom',
        className: 'custom',
      })
    );
  });
});

describe('BlueInfoCircleIcon', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the blue info circle icon', () => {
    const { getByTestId } = render(<BlueInfoCircleIcon />);
    const icon = getByTestId('mock-info-circle-icon');

    expect(icon).toBeInTheDocument();
  });

  it('should render a blue info circle icon in blue color', () => {
    const { getByTestId } = render(<BlueInfoCircleIcon />);
    const icon = getByTestId('mock-info-circle-icon');

    expect(icon).toHaveAttribute('color', '#4394e5');
  });

  it('renders a blue info circle icon with custom size, classnames and title', () => {
    render(<BlueInfoCircleIcon title="custom" className="custom" />);

    expect(mockInfoCircleIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'custom',
        className: 'custom',
      })
    );
  });
});

describe('GrayUnknownIcon', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the grey unknown icon', () => {
    const { getByTestId } = render(<GrayUnknownIcon />);
    const icon = getByTestId('mock-unknown-icon');

    expect(icon).toBeInTheDocument();
  });

  it('should render a grey unknown icon in grey color', () => {
    const { getByTestId } = render(<GrayUnknownIcon />);
    const icon = getByTestId('mock-unknown-icon');

    expect(icon).toHaveAttribute('color', '#c7c7c7');
  });

  it('renders a grey unknown icon with custom size, classnames and title', () => {
    render(<GrayUnknownIcon title="custom" className="custom" />);

    expect(mockUnknownIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'custom',
        className: 'custom',
      })
    );
  });
});

describe('BlueSyncIcon', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the blue sync icon', () => {
    const { getByTestId } = render(<BlueSyncIcon />);
    const icon = getByTestId('mock-sync-alt-icon');

    expect(icon).toBeInTheDocument();
  });

  it('should render a blue sync icon in blue color', () => {
    const { getByTestId } = render(<BlueSyncIcon />);
    const icon = getByTestId('mock-sync-alt-icon');

    expect(icon).toHaveAttribute('color', '#4394e5');
  });

  it('renders a blue sync icon with custom size, classnames and title', () => {
    render(<BlueSyncIcon title="custom" className="custom" />);

    expect(mockSyncAltIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'custom',
        className: 'custom',
      })
    );
  });
});

describe('RedResourcesFullIcon', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the red resource full icon', () => {
    const { getByTestId } = render(<RedResourcesFullIcon />);
    const icon = getByTestId('mock-resources-full-icon');

    expect(icon).toBeInTheDocument();
  });

  it('should render a red resource full icon in red color', () => {
    const { getByTestId } = render(<RedResourcesFullIcon />);
    const icon = getByTestId('mock-resources-full-icon');

    expect(icon).toHaveAttribute('color', '#b1380b');
  });

  it('renders a red resource full icon with custom size, classnames and title', () => {
    render(<RedResourcesFullIcon title="custom" className="custom" />);

    expect(mockResourcesFullIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'custom',
        className: 'custom',
      })
    );
  });
});

describe('YellowResourcesAlmostFullIcon', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the yellow resource almost full icon', () => {
    const { getByTestId } = render(<YellowResourcesAlmostFullIcon />);
    const icon = getByTestId('mock-resources-almost-full-icon');

    expect(icon).toBeInTheDocument();
  });

  it('should render a yellow resource almost full icon in yellow color', () => {
    const { getByTestId } = render(<YellowResourcesAlmostFullIcon />);
    const icon = getByTestId('mock-resources-almost-full-icon');

    expect(icon).toHaveAttribute('color', '#73480b');
  });

  it('renders a yellow resource almost full icon with custom size, classnames and title', () => {
    render(<YellowResourcesAlmostFullIcon title="custom" className="custom" />);

    expect(mockResourcesAlmostFullIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'custom',
        className: 'custom',
      })
    );
  });
});

describe('BlueArrowCircleUpIcon', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the blue arrow circle up icon', () => {
    const { getByTestId } = render(<BlueArrowCircleUpIcon />);
    const icon = getByTestId('mock-arrow-circle-up-icon');

    expect(icon).toBeInTheDocument();
  });

  it('should render a blue arrow circle up icon in blue color', () => {
    const { getByTestId } = render(<BlueArrowCircleUpIcon />);
    const icon = getByTestId('mock-arrow-circle-up-icon');

    expect(icon).toHaveAttribute('color', '#4394e5');
  });

  it('renders a blue arrow circle up icon with custom size, classnames and title', () => {
    render(<BlueArrowCircleUpIcon title="custom" className="custom" />);

    expect(mockArrowCircleUpIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'custom',
        className: 'custom',
      })
    );
  });
});
