import {
  WatchK8sResource,
  WatchK8sResources,
  ResourcesObject,
  K8sModel,
} from '@openshift-console/dynamic-plugin-sdk';
import { CustomPrometheusPollProps } from '../hooks/custom-prometheus-poll/custom-prometheus-poll-hook';

/**
 * Returns "undefined" to make sure that no unnecessary API request is made unless needed (or "isSafe" to do so).
 * Example use case with "useK8sWatchResource" hook.
 */
export const getValidWatchK8sResourceObj = (
  initResource: WatchK8sResource,
  isSafe: boolean
): WatchK8sResource | undefined => (isSafe ? initResource : undefined);

/**
 * Returns "{}" to make sure that no unnecessary API request is made unless needed (or "isSafe" to do so).
 * Example use case with "useK8sWatchResources" hook.
 */
export const getValidWatchK8sResourcesObj = (
  initResources: WatchK8sResources<ResourcesObject>,
  isSafe: boolean
): WatchK8sResources<ResourcesObject> | undefined =>
  isSafe ? initResources : {};

type SafeOptions = [K8sModel, string, string, string] | [K8sModel, string];
type UnSafeOptions = [undefined];
type K8sOptions = SafeOptions | UnSafeOptions;
/**
 * Returns "[undefined]" to make sure that no unnecessary API request is made unless needed (or "isSafe" to do so).
 * Need to spread (...) before passing these as arguments to the the hook.
 * Example use case with "useK8sGet", "useK8sList" hooks.
 */
export const getValidK8sOptions = (
  isSafe: boolean,
  ...initOptions: SafeOptions
): K8sOptions => (isSafe ? initOptions : [undefined]);

/**
 * Returns "{ endpoint: undefined, query: undefined }" to make sure that no unnecessary API request is made unless needed (or "isSafe" to do so).
 * Example use case with "useCustomPrometheusPoll" hook.
 */
export const getValidPrometheusPollObj = (
  initProps: CustomPrometheusPollProps,
  isSafe: boolean
): CustomPrometheusPollProps =>
  isSafe ? initProps : { endpoint: undefined, query: undefined };
