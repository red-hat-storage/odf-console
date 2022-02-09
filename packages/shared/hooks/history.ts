import { createBrowserHistory, createMemoryHistory, History } from 'history';
import * as _ from 'lodash';

type AppHistory = History & { pushPath: History['push'] };

let createHistory;

try {
  if (process.env.NODE_ENV === 'test') {
    // Running in node. Can't use browser history
    createHistory = createMemoryHistory;
  } else {
    createHistory = createBrowserHistory;
  }
} catch (unused) {
  createHistory = createBrowserHistory;
}
 // @ts-ignore
export const history: AppHistory = createHistory({ basename: window.SERVER_FLAGS.basePath });

const removeBasePath = (url = '/') =>
 // @ts-ignore
  _.startsWith(url, window.SERVER_FLAGS.basePath)
   // @ts-ignore
    ? url.slice(window.SERVER_FLAGS.basePath.length - 1)
    : url;

// Monkey patch history to slice off the base path
(history as any).__replace__ = history.replace;
history.replace = (url) => (history as any).__replace__(removeBasePath(url));

(history as any).__push__ = history.push;
history.push = (url) => (history as any).__push__(removeBasePath(url));
(history as any).pushPath = (path) => (history as any).__push__(path);
