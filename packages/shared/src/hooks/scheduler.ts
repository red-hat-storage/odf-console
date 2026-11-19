import * as React from 'react';
import { URL_POLL_DEFAULT_DELAY } from './custom-prometheus-poll/use-url-poll';

// Pass syncTime=null to skip scheduling (same idea as usePoll with a falsy delay).
export const useScheduler: UseSchedulerProps = (
  schedulerFunction: SchedulerFunction,
  syncTime?: number | null
) => {
  const clearSetIntervalId = React.useRef<NodeJS.Timeout>();
  React.useEffect(() => {
    if (syncTime === null) {
      return;
    }
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
  syncTime?: number | null
) => void;
