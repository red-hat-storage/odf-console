import * as React from 'react';

/**
 * Can be used for un-mounting and immediately re-mounting a React component.
 * ex: refreshing API calls (re-fetching data on demand).

 * "visualDelay" (optional): visual delay on the UI to make sure loading state can be perceived by the users (needed when data is loaded directly from the cache)
 * "shouldUsePromise" (optional): using promise will be faster, but in case of caching we can't add any "visualDelay" on the UI (this method will work best if caching is not enabled)
 */
export const useRefresh = (
  visualDelay = 0,
  shouldUsePromise = false
): [boolean, () => void] => {
  const [fresh, setFresh] = React.useState(true);
  const id = React.useRef<NodeJS.Timeout>();

  const triggerRefresh = React.useCallback(() => {
    setFresh(false);

    if (shouldUsePromise) {
      // queuing for immediate re-toggle
      const promise = Promise.resolve(() => setFresh(true));
      promise.then((callback) => callback());
    } else {
      // clearing older timer and
      // queuing for immediate re-toggle
      clearTimeout(id.current);
      id.current = setTimeout(() => setFresh(true), visualDelay);
    }
  }, [setFresh, visualDelay, shouldUsePromise]);

  return [fresh, triggerRefresh];
};
