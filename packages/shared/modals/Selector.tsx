import * as React from 'react';
import {
  MatchExpression,
  MatchLabels,
  Selector,
} from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import * as TagsInput from 'react-tagsinput';
import * as k8sSelectorRequirement from './selector-requirement';
import { createEquals, requirementFromString } from './selector-requirement';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'tags-input': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

export const split = (str: string) =>
  str.trim() ? str.split(/,(?![^(]*\))/) : []; // [''] -> []

type Options = { undefinedWhenEmpty?: boolean; basic?: boolean };

export const fromRequirements = (
  requirements: MatchExpression[],
  options = {} as Options
) => {
  options = options || {};
  const selector = {
    matchLabels: {},
    matchExpressions: [],
  };

  if (options.undefinedWhenEmpty && requirements.length === 0) {
    return;
  }

  requirements.forEach((r) => {
    if (r.operator === 'Equals') {
      selector.matchLabels[r.key] = r.values[0];
    } else {
      selector.matchExpressions.push(r);
    }
  });

  // old selector format?
  if (options.basic) {
    return selector.matchLabels;
  }

  return selector;
};

export const selectorFromString = (str: string) => {
  const requirements = split(str || '').map(
    requirementFromString
  ) as MatchExpression[];
  return fromRequirements(requirements);
};

const isOldFormat = (selector: Selector | MatchLabels) =>
  !selector.matchLabels && !selector.matchExpressions;

const toArray = (value) => (Array.isArray(value) ? value : [value]);

export const requirementToString = (requirement: MatchExpression): string => {
  if (requirement.operator === 'Equals') {
    return `${requirement.key}=${requirement.values[0]}`;
  }

  if (requirement.operator === 'NotEquals') {
    return `${requirement.key}!=${requirement.values[0]}`;
  }

  if (requirement.operator === 'Exists') {
    return requirement.key;
  }

  if (requirement.operator === 'DoesNotExist') {
    return `!${requirement.key}`;
  }

  if (requirement.operator === 'In') {
    return `${requirement.key} in (${toArray(requirement.values).join(',')})`;
  }

  if (requirement.operator === 'NotIn') {
    return `${requirement.key} notin (${toArray(requirement.values).join(
      ','
    )})`;
  }

  if (requirement.operator === 'GreaterThan') {
    return `${requirement.key} > ${requirement.values[0]}`;
  }

  if (requirement.operator === 'LessThan') {
    return `${requirement.key} < ${requirement.values[0]}`;
  }

  return '';
};

export const toRequirements = (selector: Selector = {}): MatchExpression[] => {
  const requirements = [];
  const matchLabels = isOldFormat(selector) ? selector : selector.matchLabels;
  const { matchExpressions } = selector;

  Object.keys(matchLabels || {})
    .sort()
    .forEach(function (k) {
      requirements.push(createEquals(k, matchLabels[k]));
    });

  (matchExpressions || []).forEach(function (me) {
    requirements.push(me);
  });

  return requirements;
};

export const selectorToString = (selector: Selector): string => {
  const requirements = toRequirements(selector);
  return requirements.map(requirementToString).join(',');
};

// Helpers for cleaning up tags by running them through the selector parser
const cleanSelectorStr = (tag) => selectorToString(selectorFromString(tag));
const cleanTags = (tags) => split(cleanSelectorStr(tags.join(',')));

type SelectorInputState = {
  inputValue: string;
  isInputValid: boolean;
  tags: any;
};

export class SelectorInput extends React.Component<any, SelectorInputState> {
  isBasic: boolean;
  setRef: (ref: any) => any;
  ref_: any;

  constructor(props) {
    super(props);
    this.isBasic = !!_.get(this.props.options, 'basic');
    this.setRef = (ref) => (this.ref_ = ref);
    this.state = {
      inputValue: '',
      isInputValid: true,
      tags: this.props.tags,
    };
  }

  static arrayify(obj) {
    return _.map(obj, (v, k) => (v ? `${k}=${v}` : k));
  }

  static objectify(arr) {
    const result = {};
    _.each(arr, (item) => {
      const [key, value = null] = item.split('=');
      result[key] = value;
    });
    return result;
  }

  focus() {
    this.ref_ && this.ref_.focus();
  }

  isTagValid(tag) {
    const requirement = k8sSelectorRequirement.requirementFromString(tag);
    return !!(
      requirement &&
      (!this.isBasic || requirement.operator === 'Equals')
    );
  }

  handleInputChange(e) {
    // We track the input field value in state so we can retain the input value when an invalid tag is entered.
    // Otherwise, the default behaviour of TagsInput is to clear the input field.
    const inputValue = e.target.value;

    // If the user deletes an existing inputValue, set isInputValid back to true
    if (inputValue === '') {
      this.setState({ inputValue, isInputValid: true });
      return;
    }

    this.setState({ inputValue, isInputValid: this.isTagValid(inputValue) });
  }

  handleChange(tags, changed) {
    // The way we use TagsInput, there should only ever be one new tag in changed
    const newTag = changed[0];

    if (!this.isTagValid(newTag)) {
      this.setState({ isInputValid: false });
      return;
    }

    // Clean up the new tag by running it through the selector parser
    const cleanNewTag = cleanSelectorStr(newTag);

    // Is the new tag a duplicate of an already existing tag?
    // Note that TagsInput accepts an onlyUnique property, but we handle this logic ourselves so that we can set a
    // custom error class
    if (_.filter(tags, (tag) => tag === cleanNewTag).length > 1) {
      this.setState({ isInputValid: false });
      return;
    }

    const newTags = cleanTags(tags);
    this.setState({ inputValue: '', isInputValid: true, tags: newTags });
    this.props.onChange(newTags);
  }

  render() {
    const { inputValue, isInputValid, tags } = this.state;

    // Keys that add tags: Enter
    const addKeys = [13];

    // Backspace deletes tags, but not if there is text being edited in the input field
    const removeKeys = inputValue.length ? [] : [8];

    const inputProps = {
      autoFocus: this.props.autoFocus,
      className: classNames('input', { 'invalid-tag': !isInputValid }),
      onChange: this.handleInputChange.bind(this),
      placeholder: _.isEmpty(tags)
        ? this.props.placeholder || 'app=frontend'
        : '',
      spellCheck: 'false',
      value: inputValue,
      id: 'tags-input',
      ['data-test']: 'tags-input',
      ...(this.props.inputProps || {}),
    };

    const renderTag = ({ tag, key, onRemove, getTagDisplayValue }) => {
      return (
        <span
          className={classNames('tag-item', this.props.labelClassName)}
          key={key}
        >
          <span className="tag-item__content">{getTagDisplayValue(tag)}</span>
          &nbsp;
          <a className="remove-button" onClick={() => onRemove(key)}>
            ×
          </a>
        </span>
      );
    };

    return (
      <div className="co-search-input pf-c-form-control">
        <tags-input>
          <TagsInput
            ref={this.setRef}
            className="tags"
            value={tags}
            addKeys={addKeys}
            removeKeys={removeKeys}
            inputProps={inputProps}
            renderTag={renderTag}
            onChange={this.handleChange.bind(this)}
            addOnBlur
          />
        </tags-input>
      </div>
    );
  }
}
