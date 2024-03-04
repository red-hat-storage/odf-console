export const ALL_APPS = 'All Application';
export const ALL_APPS_ITEM_ID = 'all-applications-itemid';

// Volume replication threshold
export const THRESHOLD = 3;

// Metrics labels
export const OBJECT_NAME = 'obj_name';
export const OBJECT_NAMESPACE = 'obj_namespace';

// Volume replication health status
export const enum VOLUME_REPLICATION_HEALTH {
  CRITICAL = 'critical',
  WARNING = 'warning',
  HEALTHY = 'healthy',
}

// Prometheus time() - 0 in seconds
// For more info: https://github.com/RamenDR/ramen/blob/5b80317c82cb484f6a639e24967967adb38d708d/config/prometheus/alerts.yaml#L14
export const LEAST_SECONDS_IN_PROMETHEUS = 1697788182;

export const GETTING_STARTED_USER_SETTINGS_KEY_OVERVIEW_DASHBOARD =
  '"mcoConsole.overviewDashboard.gettingStarted.expanded"';
