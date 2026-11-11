import { useToast } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

// TODO: Remove this wrapper once CI runs on OCP 4.23 or newer.
// The 4.22 console used in CI does not export useToast.
const useAddToastIfAvailable =
  typeof useToast === 'function' ? () => useToast().addToast : () => _.noop;

export const useToastWrapper = () => useAddToastIfAvailable();
