import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import {
  LazyNameValueEditor,
  CustomInputProps,
} from '@odf/shared/utils/NameValueEditor';
import {
  Button,
  TextInput,
  Flex,
  FlexItem,
  Divider,
  FormGroup,
  Text,
  Icon,
  Tooltip,
} from '@patternfly/react-core';
import {
  MinusCircleIcon,
  HelpIcon,
  TagIcon,
  InfoCircleIcon,
} from '@patternfly/react-icons';

export type KeyValuePair = {
  Key: string;
  Value: string;
};

type AddKeyValuePairsProps = {
  pairs: KeyValuePair[];
  setPairs: React.Dispatch<React.SetStateAction<KeyValuePair[]>>;
  disableAddTags: boolean;
};

const CustomTagInput: React.FC<CustomInputProps> = ({
  name,
  value,
  nameString,
  valueString,
  readOnly,
  index,
  onChange,
  onRemove,
  nameMaxLength,
  valueMaxLength,
  toolTip,
}) => {
  const { t } = useCustomTranslation();

  return (
    <Flex className="pf-v5-u-mt-md" style={{ width: '100%' }}>
      <FlexItem style={{ flex: 1 }}>
        <FormGroup label={t(nameString)} id={`${nameString}-${index}`}>
          <TextInput
            value={name}
            onChange={(e) => onChange('name', e.currentTarget.value)}
            placeholder={t('Input field')}
            isDisabled={readOnly}
            maxLength={nameMaxLength}
          />
        </FormGroup>
      </FlexItem>

      <FlexItem style={{ flex: 1 }}>
        <FormGroup label={t(valueString)} id={`${valueString}-${index}`}>
          <TextInput
            value={value}
            onChange={(e) => onChange('value', e.currentTarget.value)}
            placeholder={t('Input field')}
            isDisabled={readOnly}
            maxLength={valueMaxLength}
          />
        </FormGroup>
      </FlexItem>

      {!readOnly && onRemove && (
        <FlexItem alignSelf={{ default: 'alignSelfFlexEnd' }}>
          <Tooltip content={toolTip || t('Remove')}>
            <Button variant="plain" aria-label="Remove pair" onClick={onRemove}>
              <Icon size="lg">
                <MinusCircleIcon color="var(--pf-v5-global--danger-color--100)" />
              </Icon>
            </Button>
          </Tooltip>
        </FlexItem>
      )}
    </Flex>
  );
};

export const AddKeyValuePairs: React.FC<AddKeyValuePairsProps> = ({
  pairs,
  setPairs,
  disableAddTags,
}) => {
  // Convert KeyValuePair[] to nameValuePairs format: [name, value, index][]
  const { t } = useCustomTranslation();
  const nameValuePairs = React.useMemo(() => {
    if (pairs.length === 0) {
      return [];
    }
    return pairs.map((pair, index) => [pair.Key, pair.Value, index]);
  }, [pairs]);

  // Convert nameValuePairs format back to KeyValuePair[]

  const handleUpdateParentData = React.useCallback(
    (data: { nameValuePairs: any[] }) => {
      const updatedPairs: KeyValuePair[] = data.nameValuePairs.map((pair) => ({
        Key: pair[0],
        Value: pair[1],
      }));
      setPairs(updatedPairs);
    },
    [setPairs]
  );

  const handleLastItemRemoved = React.useCallback(() => {
    setPairs([]);
  }, [setPairs]);

  return (
    <div>
      <Flex>
        <FlexItem spacer={{ default: 'spacerXs' }}>
          <strong>{t('Tags')}</strong>
        </FlexItem>

        <FlexItem className="pf-v5-u-pl-sm">
          <HelpIcon color="var(--pf-v5-global--disabled-color--100)" />
        </FlexItem>

        <FlexItem>
          <Button
            variant="link"
            icon={<TagIcon />}
            iconPosition="left"
            style={{
              color: disableAddTags
                ? 'var(--pf-v5-global--disabled-color--100)'
                : 'var(--pf-v5-global--primary-color--100)',
            }}
            onClick={() => {
              setPairs([...pairs, { Key: '', Value: '' }]);
            }}
            isDisabled={disableAddTags}
          >
            {t('Add tags')}
          </Button>
        </FlexItem>
      </Flex>

      <Text component="p" className="pf-v5-u-mt-md">
        <InfoCircleIcon
          className="pf-v5-u-mr-sm"
          color="var(--pf-v5-global--info-color--100)"
        />
        {t(`You can add ${50 - pairs.length} more pairs`)}
      </Text>
      {pairs.length === 0 ? (
        <div className="pf-v5-u-disabled-color-100 pf-v5-u-mt-sm">
          {t('No tags are attached to this user.')}
        </div>
      ) : (
        <LazyNameValueEditor
          nameValuePairs={nameValuePairs}
          updateParentData={handleUpdateParentData}
          nameValueId={1}
          onLastItemRemoved={handleLastItemRemoved}
          addString="Add tags"
          allowSorting={false}
          readOnly={false}
          toolTip={t('Remove tag')}
          nameString="Key"
          valueString="Value"
          isAddDisabled={true}
          hideHeaderWhenNoItems={false}
          IconComponent={TagIcon}
          customInputComponent={CustomTagInput}
          hideHeaderWithCustomInput={true}
          alwaysAllowRemove={true}
          configMaps={{}}
          secrets={{}}
          addConfigMapSecret={false}
        />
      )}
      <Divider className="pf-v5-u-mt-2xl" />
    </div>
  );
};
