import * as React from 'react';
import { Button, TextInput } from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useCustomTranslation } from '../useCustomTranslationHook';

export type KeyListEditorProps = {
  keyList: string[];
  onChange: (values: string[]) => void;
  addButtonLabel?: string;
  isAddDisabled?: boolean;
  keysMaxLength?: number;
  className?: string;
};

/**
 * Editor for a list of keys (add key / remove key). Use when you need a list of key-only
 * values, not key-value pairs.
 */
export const KeyListEditor: React.FC<KeyListEditorProps> = ({
  keyList,
  onChange,
  addButtonLabel,
  isAddDisabled = false,
  keysMaxLength,
  className,
}) => {
  const { t } = useCustomTranslation();

  const updateAt = React.useCallback(
    (index: number, value: string) => {
      const next = [...keyList];
      next[index] = value;
      onChange(next);
    },
    [keyList, onChange]
  );

  const removeAt = React.useCallback(
    (index: number) => {
      const next = keyList.filter((_, i) => i !== index);
      onChange(next);
    },
    [keyList, onChange]
  );

  const add = React.useCallback(() => {
    onChange([...keyList, '']);
  }, [keyList, onChange]);

  const isEmpty = keyList.length === 1;

  return (
    <div className={className}>
      {keyList.map((value, index) => (
        <div
          key={index}
          className="pf-v5-u-display-flex pf-v5-u-align-items-center pf-v5-u-mb-sm"
          data-test="key-list-row"
        >
          <TextInput
            value={value}
            onChange={(_e, v) => updateAt(index, v)}
            maxLength={keysMaxLength}
            className="pf-v5-u-flex-grow-1 pf-v5-u-mr-sm"
            data-test="key-list-input"
          />
          <Button
            type="button"
            variant="plain"
            onClick={() => removeAt(index)}
            isDisabled={isEmpty}
            aria-label={t('Remove')}
            data-test="key-list-remove"
          >
            <MinusCircleIcon />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="link"
        onClick={add}
        isDisabled={isAddDisabled}
        className="pf-m-link--align-left"
        data-test="key-list-add"
      >
        <PlusCircleIcon className="co-icon-space-r" />
        {addButtonLabel ?? t('Add key')}
      </Button>
    </div>
  );
};
