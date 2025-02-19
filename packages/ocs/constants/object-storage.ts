import { TFunction } from 'react-i18next';

export enum ServiceType {
  MCG = 'Multicloud Object Gateway',
  RGW = 'Object Gateway (RGW)',
  ALL = 'All',
}

export namespace CapacityBreakdown {
  export enum Metrics {
    TOTAL = 'Total',
    PROJECTS = 'Projects',
    BC = 'Bucket Classses',
    OBC = 'Object Bucket Claims',
  }

  export const defaultMetrics = Object.freeze({
    [ServiceType.MCG]: Metrics.PROJECTS,
    [ServiceType.RGW]: Metrics.TOTAL,
    [ServiceType.ALL]: Metrics.TOTAL,
  });

  export const serviceMetricMap = Object.freeze({
    [ServiceType.ALL]: {
      [CapacityBreakdown.Metrics.TOTAL]: [ServiceType.RGW, ServiceType.MCG],
    },
    [ServiceType.RGW]: {
      [CapacityBreakdown.Metrics.TOTAL]: [ServiceType.RGW],
    },
    [ServiceType.MCG]: {
      [CapacityBreakdown.Metrics.TOTAL]: [ServiceType.MCG],
    },
  });
}

export enum Breakdown {
  ACCOUNTS = 'Accounts',
  PROVIDERS = 'Providers',
}

export enum Metrics {
  IOPS = 'I/O Operations',
  LOGICAL = 'Logical Used Capacity',
  EGRESS = 'Egress',
  PHY_VS_LOG = 'Physical Vs Logical Usage',
  LATENCY = 'Latency',
  BANDWIDTH = 'Bandwidth',
  TOTAL = 'TOTAL',
}
export enum Groups {
  BREAKDOWN = 'Break By',
  METRIC = 'Metric',
  SERVICE = 'Service Type',
}

export namespace DataConsumption {
  export const defaultMetrics = {
    [ServiceType.RGW]: Metrics.BANDWIDTH,
    [ServiceType.MCG]: Metrics.IOPS,
  };
}

export const defaultBreakdown = {
  [ServiceType.MCG]: Breakdown.ACCOUNTS,
};

export const CHART_LABELS = (metric, t: TFunction) => {
  switch (metric) {
    case [Metrics.LOGICAL]:
      return t('plugin__odf-console~Logical used capacity per account');
    case [Metrics.PHY_VS_LOG]:
      return t('plugin__odf-console~Physical vs. Logical used capacity');
    case [Metrics.EGRESS]:
      return t('plugin__odf-console~Egress Per Provider');
    case [Metrics.IOPS]:
      return t('plugin__odf-console~I/O Operations count');
    case [Metrics.BANDWIDTH]:
      return t('plugin__odf-console~Bandwidth');
    case [Metrics.LATENCY]:
      return t('plugin__odf-console~Latency');
    default:
      return '';
  }
};

export enum StatusType {
  HEALTH = 'HEALTH',
  RESILIENCY = 'RESILIENCY',
}

export enum Phase {
  CONNECTED = 'Connected',
  PROGRESSING = 'Progressing',
  FAILURE = 'Failure',
  READY = 'Ready',
}
