import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import { BlueInfoCircleIcon } from '@odf/shared/status';
import { LazyNameValueEditor } from '@odf/shared/utils/NameValueEditor';
import * as _ from 'lodash-es';
import { FormGroup, Divider, Content } from '@patternfly/react-core';
import { TagIcon } from '@patternfly/react-icons';
import {
  MAX_TAGS,
  TAG_KEY_MAX_LENGTH,
  TAG_VALUE_MAX_LENGTH,
} from '../../../constants/s3-iam';
import { KeyValuePair } from '../../../types/s3-iam';

export type AddKeyValuePairsProps = {
  pairs: KeyValuePair[];
  setPairs: React.Dispatch<React.SetStateAction<KeyValuePair[]>>;
};

export const AddKeyValuePairs: React.FC<AddKeyValuePairsProps> = ({
  pairs,
  setPairs,
}) => {
  const { t } = useCustomTranslation();

  // Convert KeyValuePair[] to nameValuePairs format: [name, value, index][]
  const nameValuePairs = React.useMemo(() => {
    return pairs.map((pair, index) => [pair.Key, pair.Value, index]);
  }, [pairs]);

  const handleUpdateParentData = React.useCallback(
    (data: { nameValuePairs: any[] }) => {
      // Use Map for semantic key-value processing (preserves insertion order)
      const pairsMap = new Map<string, string>();
      data.nameValuePairs.forEach(([key, value]) => {
        pairsMap.set(key || '', value || '');
      });

      // Convert Map entries to KeyValuePair[] format (order is preserved)
      const updatedPairs: KeyValuePair[] = Array.from(pairsMap.entries()).map(
        ([Key, Value]) => ({ Key, Value })
      );
      setPairs(updatedPairs);
    },
    [setPairs]
  );

  const removeAllPairs = React.useCallback(() => {
    setPairs([]);
  }, [setPairs]);

  // Count valid tags (non-empty keys)
  const numberOfTagsAdded = pairs?.length;
  const remainingTags = MAX_TAGS - numberOfTagsAdded;

  return (
    <div>
      <FormGroup
        label={t('Tags')}
        className={_.isEmpty(pairs) ? 'pf-v6-u-mt-md' : 'pf-v6-u-mt-md'}
      >
        <Content component="p" className="pf-v6-u-mb-sm">
          <BlueInfoCircleIcon className="pf-v6-u-mr-sm" />
          {t(`You can add ${remainingTags} more tags`)}
        </Content>

        {_.isEmpty(pairs) && (
          <div className="text-muted pf-v6-u-mb-sm">
            {t('No tags are attached to this user.')}
          </div>
        )}
        <LazyNameValueEditor
          nameValuePairs={nameValuePairs}
          updateParentData={handleUpdateParentData}
          nameValueId={1}
          onLastItemRemoved={removeAllPairs}
          addString={t('Add tag')}
          valueString={t('Value (optional)')}
          hideHeaderWhenNoItems={true}
          IconComponent={TagIcon}
          nameMaxLength={TAG_KEY_MAX_LENGTH}
          valueMaxLength={TAG_VALUE_MAX_LENGTH}
          allowSorting={false}
          readOnly={false}
          toolTip={t('Remove tag')}
          nameString={t('Key')}
          configMaps={{}}
          secrets={{}}
          addConfigMapSecret={false}
          alwaysAllowRemove={true}
        />
      </FormGroup>
      <Divider className="pf-v6-u-mt-2xl" />
    </div>
  );
};
