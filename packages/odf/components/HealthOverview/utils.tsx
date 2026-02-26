import * as React from 'react';
import { AlertSeverity } from '@openshift-console/dynamic-plugin-sdk';
import {
  SeverityImportantIcon,
  SeverityMinorIcon,
  SeverityModerateIcon,
} from '@patternfly/react-icons';

/**
 * Maps UI severity filter values to Prometheus severity labels
 * Used in FilterableAlertsTable and SilencedAlertsTable for filtering
 */
export const SEVERITY_MAP: Record<string, string> = {
  critical: 'critical',
  moderate: 'warning',
  minor: 'info',
};

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

/**
 * Returns the PatternFly CSS color variable for a given severity level
 * @param severity - Alert severity level (critical, warning, info, etc.)
 * @returns CSS color variable string
 */
export const getSeverityColor = (severity: string): string => {
  const normalizedSeverity = severity?.toLowerCase();

  if (normalizedSeverity === AlertSeverity.Critical) {
    return 'var(--pf-t--global--color--status--danger--default)';
  } else if (normalizedSeverity === AlertSeverity.Warning) {
    return 'var(--pf-t--global--color--status--warning--default)';
  } else {
    return 'var(--pf-t--global--color--status--info--default)';
  }
};

export const getSeverityIcon = (severity: string): React.ReactNode => {
  const color = getSeverityColor(severity);
  const normalizedSeverity = severity?.toLowerCase();

  if (normalizedSeverity === AlertSeverity.Critical) {
    return <SeverityImportantIcon className="pf-v6-u-mr-sm" color={color} />;
  } else if (normalizedSeverity === AlertSeverity.Warning) {
    return <SeverityModerateIcon className="pf-v6-u-mr-sm" color={color} />;
  } else {
    return <SeverityMinorIcon className="pf-v6-u-mr-sm" color={color} />;
  }
};

/**
 * Returns today's date in YYYY-MM-DD format
 * @returns Date string in YYYY-MM-DD format
 */
export const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses date and time strings (YYYY-MM-DD and hh:mm AM/PM) into a Unix timestamp
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in hh:mm AM/PM format
 * @returns Unix timestamp in milliseconds, or null if invalid
 */
export const parseDateTimeToTimestamp = (
  dateStr: string,
  timeStr: string
): number | null => {
  if (!dateStr || !timeStr) {
    return null;
  }

  try {
    // Parse the date (YYYY-MM-DD format)
    const [year, month, day] = dateStr.split('-').map(Number);

    // Parse the time (hh:mm AM/PM format)
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!timeMatch) {
      return null;
    }

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[3].toUpperCase();

    // Convert to 24-hour format
    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    const date = new Date(year, month - 1, day, hours, minutes);
    return date.getTime();
  } catch (_e) {
    return null;
  }
};
