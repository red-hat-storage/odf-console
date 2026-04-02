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

/**
 * Hook that initializes and configures a Visualization controller
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

  // Store event listeners in a ref to avoid recreating listeners on every render
  const eventListenersRef = React.useRef<EventListener[]>(eventListeners);
  React.useEffect(() => {
    eventListenersRef.current = eventListeners;
  });

  // Register event listeners
  React.useEffect(() => {
    if (!controller) return;

    const listeners = eventListenersRef.current;
    if (listeners.length === 0) return;

    listeners.forEach(({ event, handler }) => {
      controller.addEventListener(event, handler);
    });

    return () => {
      listeners.forEach(({ event, handler }) => {
        controller.removeEventListener(event, handler);
      });
    };
  }, [controller]);

  return controller;
};
