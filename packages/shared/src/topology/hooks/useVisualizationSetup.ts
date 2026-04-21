import * as React from 'react';
import { ComponentFactory, Visualization } from '@patternfly/react-topology';
import { defaultLayoutFactory } from '../factory';

export type EventListener = {
  event: string;
  handler: (...args: any[]) => void;
};

export type UseVisualizationSetupOptions = {
  componentFactory: ComponentFactory;
  eventListeners?: EventListener[];
};

// Type alias for handler function to avoid eslint spacing issues in generics
type HandlerFunction = (...args: any[]) => void;

/**
 * Hook that initializes and configures a Visualization controller
 *
 * Uses refs to store handlers, allowing handler updates without re-registering listeners.
 * This prevents listener thrashing and stale closure bugs.
 */
export const useVisualizationSetup = ({
  componentFactory,
  eventListeners = [],
}: UseVisualizationSetupOptions): Visualization => {
  // Create the controller synchronously so VisualizationProvider never falls back to
  // an unconfigured Visualization (child effects run before parent useEffect).
  const [controller] = React.useState<Visualization>(() => {
    const temp = new Visualization();
    temp.registerLayoutFactory(defaultLayoutFactory);
    temp.registerComponentFactory(componentFactory);
    return temp;
  });

  // Store the latest handlers in a ref so we can update them without re-registering
  const handlersRef = React.useRef<Map<string, HandlerFunction>>(new Map());

  // Update handlers ref whenever eventListeners changes
  // No dependency array: intentionally runs on every render to ensure the ref
  // always has the latest handler functions, preventing stale closures
  React.useEffect(() => {
    handlersRef.current.clear();
    eventListeners.forEach(({ event, handler }) => {
      handlersRef.current.set(event, handler);
    });
  });

  // Create a stable key from event names to detect changes
  const eventKeys = React.useMemo(
    () =>
      eventListeners
        .map((l) => l.event)
        .sort()
        .join(','),
    [eventListeners]
  );

  // Register event listeners only once with stable wrapper functions
  React.useEffect(() => {
    if (!controller) return;

    // Create wrapper functions that always call the latest handler from the ref
    const wrappers = new Map<string, HandlerFunction>();

    // Use a Set to deduplicate event names before registering listeners
    const uniqueEvents = new Set(eventListeners.map((l) => l.event));

    uniqueEvents.forEach((event) => {
      const wrapper = (...args: any[]) => {
        const latestHandler = handlersRef.current.get(event);
        if (latestHandler) {
          latestHandler(...args);
        }
      };
      wrappers.set(event, wrapper);
      controller.addEventListener(event, wrapper);
    });

    // Cleanup: remove all registered listeners on unmount or when event list changes
    return () => {
      wrappers.forEach((wrapper, event) => {
        controller.removeEventListener(event, wrapper);
      });
    };
    // We use eventKeys instead of eventListeners to avoid re-running when only handlers change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, eventKeys]);

  return controller;
};
