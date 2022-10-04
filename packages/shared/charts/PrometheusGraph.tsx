import * as React from 'react';
import { useActivePerspective } from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import { Link } from 'react-router-dom';

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

PrometheusGraph.displayName = 'PrometheusGraph';

export const PrometheusGraphLink: React.FC<PrometheusGraphLinkProps> = ({
  // Todo(bipuladh): Do not assume users can access monitoring fix this
  canAccessMonitoring = true,
  children,
  query,
  namespace,
  ariaChartLinkLabel,
}) => {
  const [perspective] = useActivePerspective();
  const queries = _.compact(_.castArray(query));
  if (!queries.length) {
    return <>{children}</>;
  }

  const params = new URLSearchParams();
  queries.forEach((q, index) => params.set(`query${index}`, q));

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

type PrometheusGraphLinkProps = {
  canAccessMonitoring?: boolean;
  query: string | string[];
  namespace?: string;
  ariaChartLinkLabel?: string;
};

type PrometheusGraphProps = {
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
  title?: string;
};
