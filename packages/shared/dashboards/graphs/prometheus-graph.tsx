import * as React from 'react';
import {
  useFlag,
  useActivePerspective,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import { Link } from 'react-router-dom';

const CAN_GET_NS = 'CAN_GET_NS';

export const getPrometheusExpressionBrowserURL = (url, queries): string => {
  if (!url || _.isEmpty(queries)) {
    return null;
  }
  const params = new URLSearchParams();
  _.each(queries, (query, i) => {
    params.set(`g${i}.range_input`, '1h');
    params.set(`g${i}.expr`, query);
    params.set(`g${i}.tab`, '0');
  });
  return `${url}/graph?${params.toString()}`;
};

export const PrometheusGraphLink: React.FC<PrometheusGraphLinkProps> = ({
  children,
  query,
  namespace,
  ariaChartLinkLabel,
}) => {
  const [perspective] = useActivePerspective();
  const queries = _.compact(_.castArray(query));
  const canGetNs = useFlag(CAN_GET_NS);
  if (!queries.length) {
    return <>{children}</>;
  }

  const params = new URLSearchParams();
  queries.forEach((q, index) => params.set(`query${index}`, q));

  const canAccessMonitoring =
    // @ts-ignore (typescript error: Property 'SERVER_FLAGS' does not exist on type 'Window & typeof globalThis')
    canGetNs && !!window.SERVER_FLAGS.prometheusBaseURL;
  const url =
    canAccessMonitoring && perspective === 'admin'
      ? `/monitoring/query-browser?${params.toString()}`
      : `/dev-monitoring/ns/${namespace}/metrics?${params.toString()}`;

  return (
    <Link
      to={url}
      aria-label={ariaChartLinkLabel}
      style={{ color: 'inherit', textDecoration: 'none' }}
    >
      {children}
    </Link>
  );
};

// eslint-disable-next-line react/display-name
export const PrometheusGraph: React.FC<PrometheusGraphProps> = React.forwardRef(
  ({ children, className, title }, ref: React.RefObject<HTMLDivElement>) => (
    <div
      ref={ref}
      className={classNames(
        'graph-wrapper graph-wrapper__horizontal-bar',
        className
      )}
    >
      {title && <h5 className="graph-title">{title}</h5>}
      {children}
    </div>
  )
);

type PrometheusGraphLinkProps = {
  query: string | string[];
  namespace?: string;
  ariaChartLinkLabel?: string;
};

type PrometheusGraphProps = {
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
  title?: string;
};
