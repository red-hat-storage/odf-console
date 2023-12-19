import * as React from 'react';
import { URL_POLL_DEFAULT_DELAY } from './custom-prometheus-poll/use-url-poll';

export const useScheduler: UseSchedulerProps = (
  schedulerFunction: SchedulerFunction,
  syncTime?: number
) => {
  const clearSetIntervalId = React.useRef<NodeJS.Timeout>();
  React.useEffect(() => {
    schedulerFunction();
    clearSetIntervalId.current = setInterval(
      schedulerFunction,
      syncTime || URL_POLL_DEFAULT_DELAY
    );
    return () => clearInterval(clearSetIntervalId.current);
  }, [schedulerFunction, syncTime]);
};

type SchedulerFunction = () => void;

type UseSchedulerProps = (
  schedulerFunction: SchedulerFunction,
  syncTime?: number
) => void;
