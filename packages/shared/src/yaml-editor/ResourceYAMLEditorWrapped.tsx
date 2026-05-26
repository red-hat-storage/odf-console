import * as React from 'react';
import {
  ResourceYAMLEditor,
  ResourceYAMLEditorProps,
} from '@openshift-console/dynamic-plugin-sdk';
import { useResourceYAMLEditorCancelNavigation } from './useResourceYAMLEditorCancelNavigation';

export const ResourceYAMLEditorWrapped: React.FC<ResourceYAMLEditorProps> = (
  props
) => {
  useResourceYAMLEditorCancelNavigation();
  return <ResourceYAMLEditor {...props} />;
};
