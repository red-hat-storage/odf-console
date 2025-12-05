import * as React from 'react';
import { AlertSeverity } from '@openshift-console/dynamic-plugin-sdk';
import {
  SeverityImportantIcon,
  SeverityMinorIcon,
  SeverityModerateIcon,
} from '@patternfly/react-icons';

export const parseAlertMessage = (
  template: string,
  labels: Record<string, string>
): string => {
  if (!template) {
    return '';
  }

  return template.replace(
    /\{\{\s*\$labels\.(\w+)\s*\}\}/g,
    (_match, labelName) => {
      const value = labels[labelName];
      return value !== undefined ? value : `{{ $labels.${labelName} }}`;
    }
  );
};

type RuleGroup = {
  rules?: any[];
};

export const extractTemplatesFromRules = (
  groups: RuleGroup[] = []
): { templates: Map<string, string>; ruleNames: Set<string> } => {
  const templates = new Map<string, string>();
  const ruleNames = new Set<string>();

  groups.forEach((group) => {
    group?.rules?.forEach((rule) => {
      const alertName = rule?.alert || rule?.name;
      if (!alertName) {
        return;
      }
      const template =
        rule?.annotations?.message ||
        rule?.annotations?.description ||
        rule?.annotations?.summary;

      ruleNames.add(alertName);

      if (template) {
        templates.set(alertName, template);
      }
    });
  });

  return { templates, ruleNames };
};

export const getSeverityIcon = (severity: string): React.ReactNode => {
  const normalizedSeverity = severity?.toLowerCase();

  if (normalizedSeverity === AlertSeverity.Critical) {
    return (
      <SeverityImportantIcon
        className="pf-v5-u-mr-sm"
        color="var(--pf-v5-global--danger-color--100)"
      />
    );
  } else if (normalizedSeverity === AlertSeverity.Warning) {
    return (
      <SeverityModerateIcon
        className="pf-v5-u-mr-sm"
        color="var(--pf-v5-global--warning-color--100)"
      />
    );
  } else {
    return (
      <SeverityMinorIcon
        className="pf-v5-u-mr-sm"
        color="var(--pf-v5-global--info-color--100)"
      />
    );
  }
};
