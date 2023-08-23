import * as React from 'react';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { render } from '@testing-library/react';
import {
  csvStatusMap,
  healthStateMap,
  healthStateMapping,
  healthStateMessage,
} from './states';

const mockGreenCheckCircleIcon = jest.fn((_unused) => {
  return <div id="green-check-circle-icon-mocked" />;
});
const mockGreyUnknownIcon = jest.fn((_unused) => {
  return <div id="grey-unknown-icon-mocked" />;
});
const mockInProgressIcon = jest.fn((_unused) => {
  return <div id="in-progress-icon-mocked" />;
});
const mockBlueSyncIcon = jest.fn((_unused) => {
  return <div id="blue-sync-icon-mocked" />;
});
const mockBlueArrowCircleUpIcon = jest.fn((_unused) => {
  return <div id="blue-arrow-circle-up-icon-mocked" />;
});
const mockYellowExclamationTriangleIcon = jest.fn((_unused) => {
  return <div id="yellow-exclamation-triangle-icon-mocked" />;
});
const mockRedExclamationCircleIcon = jest.fn((_unused) => {
  return <div id="red-exclamation-circle-icon-mocked" />;
});

jest.mock('@patternfly/react-icons', () => ({
  InProgressIcon: (props) => mockInProgressIcon(props),
}));

jest.mock('@odf/shared/status/icons', () => ({
  GreenCheckCircleIcon: (props) => mockGreenCheckCircleIcon(props),
  GrayUnknownIcon: (props) => mockGreyUnknownIcon(props),
  BlueSyncIcon: (props) => mockBlueSyncIcon(props),
  BlueArrowCircleUpIcon: (props) => mockBlueArrowCircleUpIcon(props),
  YellowExclamationTriangleIcon: (props) =>
    mockYellowExclamationTriangleIcon(props),
  RedExclamationCircleIcon: (props) => mockRedExclamationCircleIcon(props),
}));

const mockedTFunction = jest.fn().mockImplementation((props) => props);

describe('tests for health state map function', () => {
  it('should return ok when state is 0', () => {
    expect(healthStateMap('0')).toEqual(HealthState.OK);
  });
  it('should return warning when state is 1', () => {
    expect(healthStateMap('1')).toEqual(HealthState.WARNING);
  });
  it('should return error when state is 2', () => {
    expect(healthStateMap('2')).toEqual(HealthState.ERROR);
  });
  it('should return loading for any default case', () => {
    expect(healthStateMap('10')).toEqual(HealthState.LOADING);
  });
});

describe('tests for health state message function', () => {
  it('should return empty string when state is ok', () => {
    const result = healthStateMessage(HealthState.OK, mockedTFunction);
    expect(result).toBe('');
  });
  it('should return unknown when state is unknown', () => {
    const result = healthStateMessage(HealthState.UNKNOWN, mockedTFunction);
    expect(result).toBe('Unknown');
  });
  it('should return pending when state is progressing', () => {
    const result = healthStateMessage(HealthState.PROGRESS, mockedTFunction);
    expect(result).toBe('Pending');
  });
  it('should return updating when state is updating', () => {
    const result = healthStateMessage(HealthState.UPDATING, mockedTFunction);
    expect(result).toBe('Updating');
  });
  it('should return degraded when state is warning', () => {
    const result = healthStateMessage(HealthState.WARNING, mockedTFunction);
    expect(result).toBe('Degraded');
  });
  it('should return degraded when state is error', () => {
    const result = healthStateMessage(HealthState.ERROR, mockedTFunction);
    expect(result).toBe('Degraded');
  });
  it('should return loading when state is loading', () => {
    const result = healthStateMessage(HealthState.LOADING, mockedTFunction);
    expect(result).toBe('Loading');
  });
  it('should return upgrade available when state is upgradable', () => {
    const result = healthStateMessage(HealthState.UPGRADABLE, mockedTFunction);
    expect(result).toBe('Upgrade available');
  });
  it('should return not available when state is not available', () => {
    const result = healthStateMessage(
      HealthState.NOT_AVAILABLE,
      mockedTFunction
    );
    expect(result).toBe('Not available');
  });
});

describe('tests for health state mapping function', () => {
  it('should return green check circle icon with priority 0 for ok state', () => {
    expect(healthStateMapping[HealthState.OK]['priority']).toBe(0);
    expect(healthStateMapping[HealthState.OK]['health']).toEqual(
      HealthState.OK
    );
    const { container } = render(
      <>{healthStateMapping[HealthState.OK]['icon']}</>
    );
    expect(
      container.querySelector('#green-check-circle-icon-mocked')
    ).toBeTruthy();
  });

  it('should return grey unknown icon with priority 1 for unknown state', () => {
    expect(healthStateMapping[HealthState.UNKNOWN]['priority']).toBe(1);
    expect(healthStateMapping[HealthState.UNKNOWN]['health']).toEqual(
      HealthState.UNKNOWN
    );
    const { container } = render(
      <>{healthStateMapping[HealthState.UNKNOWN]['icon']}</>
    );
    expect(container.querySelector('#grey-unknown-icon-mocked')).toBeTruthy();
  });

  it('should return in progress icon with priority 2 for progress state', () => {
    expect(healthStateMapping[HealthState.PROGRESS]['priority']).toBe(2);
    expect(healthStateMapping[HealthState.PROGRESS]['health']).toEqual(
      HealthState.PROGRESS
    );
    const { container } = render(
      <>{healthStateMapping[HealthState.PROGRESS]['icon']}</>
    );
    expect(container.querySelector('#in-progress-icon-mocked')).toBeTruthy();
  });

  it('should return blue sync icon with priority 3 for updating state', () => {
    expect(healthStateMapping[HealthState.UPDATING]['priority']).toBe(3);
    expect(healthStateMapping[HealthState.UPDATING]['health']).toEqual(
      HealthState.UPDATING
    );
    const { container } = render(
      <>{healthStateMapping[HealthState.UPDATING]['icon']}</>
    );
    expect(container.querySelector('#blue-sync-icon-mocked')).toBeTruthy();
  });

  it('should return blue arrow circle up icon with priority 4 for upgradable state', () => {
    expect(healthStateMapping[HealthState.UPGRADABLE]['priority']).toBe(4);
    expect(healthStateMapping[HealthState.UPGRADABLE]['health']).toEqual(
      HealthState.UPGRADABLE
    );
    const { container } = render(
      <>{healthStateMapping[HealthState.UPGRADABLE]['icon']}</>
    );
    expect(
      container.querySelector('#blue-arrow-circle-up-icon-mocked')
    ).toBeTruthy();
  });

  it('should return yellow exclamation triangle icon with priority 5 for warning state', () => {
    expect(healthStateMapping[HealthState.WARNING]['priority']).toBe(5);
    expect(healthStateMapping[HealthState.WARNING]['health']).toEqual(
      HealthState.WARNING
    );
    const { container } = render(
      <>{healthStateMapping[HealthState.WARNING]['icon']}</>
    );
    expect(
      container.querySelector('#yellow-exclamation-triangle-icon-mocked')
    ).toBeTruthy();
  });

  it('should return red exclamation circle icon with priority 6 for error state', () => {
    expect(healthStateMapping[HealthState.ERROR]['priority']).toBe(6);
    expect(healthStateMapping[HealthState.ERROR]['health']).toEqual(
      HealthState.ERROR
    );
    const { container } = render(
      <>{healthStateMapping[HealthState.ERROR]['icon']}</>
    );
    expect(
      container.querySelector('#red-exclamation-circle-icon-mocked')
    ).toBeTruthy();
  });

  it('should return no icon with priority 7 for loading state', () => {
    expect(healthStateMapping[HealthState.LOADING]['priority']).toBe(7);
    expect(healthStateMapping[HealthState.LOADING]['health']).toEqual(
      HealthState.LOADING
    );
    const { container } = render(
      <>{healthStateMapping[HealthState.LOADING]['icon']}</>
    );
    expect(container.querySelector('.skeleton-health')).toBeTruthy();
  });

  it('should return grey unknown icon with priority 8 for not available state', () => {
    expect(healthStateMapping[HealthState.NOT_AVAILABLE]['priority']).toBe(8);
    expect(healthStateMapping[HealthState.NOT_AVAILABLE]['health']).toEqual(
      HealthState.NOT_AVAILABLE
    );
    const { container } = render(
      <>{healthStateMapping[HealthState.NOT_AVAILABLE]['icon']}</>
    );
    expect(container.querySelector('#grey-unknown-icon-mocked')).toBeTruthy();
  });
});

describe('tests for csv status map', () => {
  it('should return error state when 0 is given as input', () => {
    expect(csvStatusMap('0')).toEqual(HealthState.ERROR);
  });
  it('should return ok state when 1 is given as input', () => {
    expect(csvStatusMap('1')).toEqual(HealthState.OK);
  });
});
