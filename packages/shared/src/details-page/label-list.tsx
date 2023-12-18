import * as React from 'react';
import {
  GroupVersionKind,
  K8sResourceKindReference,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import * as _ from 'lodash-es';
/* eslint-disable import/named */
import { withTranslation, WithTranslation } from 'react-i18next';
import { Link } from 'react-router-dom-v5-compat';
/* eslint-enable import/named */

export const isGroupVersionKind = (ref: GroupVersionKind | string) =>
  ref.split('~').length === 3;

export const kindForReference = (ref: K8sResourceKindReference) =>
  isGroupVersionKind(ref) ? ref.split('~')[2] : ref;

export const Label: React.SFC<LabelProps> = ({ kind, name, value, expand }) => {
  const href = `/search?kind=${kind}&q=${
    value ? encodeURIComponent(`${name}=${value}`) : name
  }`;
  const klass = classNames('co-m-label', { 'co-m-label--expand': expand });

  return (
    <Link
      className={`co-text-${kindForReference(kind.toLowerCase())}`}
      to={href}
    >
      <div className={klass}>
        <span className="co-m-label__key" data-test="label-key">
          {name}
        </span>
        {value && <span className="co-m-label__eq">=</span>}
        {value && <span className="co-m-label__value">{value}</span>}
      </div>
    </Link>
  );
};

class TranslatedLabelList extends React.Component<LabelListProps> {
  shouldComponentUpdate(nextProps) {
    return !_.isEqual(nextProps, this.props);
  }

  render() {
    const { labels, kind, t, expand = true } = this.props;
    let list = _.map(labels, (label, key) => (
      <Label key={key} kind={kind} name={key} value={label} expand={expand} />
    ));

    if (_.isEmpty(list)) {
      list = [
        <div className="text-muted" key="0">
          {t('No labels')}
        </div>,
      ];
    }

    return (
      <div className="co-m-label-list" data-test="label-list">
        {list}
      </div>
    );
  }
}

export const LabelList = withTranslation()(TranslatedLabelList);

export type LabelProps = {
  kind: K8sResourceKindReference;
  name: string;
  value: string;
  expand: boolean;
};

export type LabelListProps = WithTranslation & {
  labels: { [key: string]: string };
  kind: K8sResourceKindReference;
  expand?: boolean;
};
