### Contributing to the ODF UI:

OpenShift Data Foundation (ODF) operator supports connecting to an external vendor storage system.

All external vendors can contribute their UI via the `Create storage class` step of `CreateStorageSystem` wizard.

#### Prerequisite:

1. The `kind` of vendor should be present in [ODF operator CSV annotation](https://github.com/red-hat-storage/odf-operator/blob/main/config/manifests/bases/odf-operator.clusterserviceversion.yaml#L32) (`vendors.odf.openshift.io/kind`)

2. Each vendor (UI) should come as a dynamic plugin: [OpenShift Console Plugin Template](https://github.com/openshift/console-plugin-template)

Follow the steps written below to integrate with the ODF wizard:

1. Any new external storage vendor would require to add a new entry to their `console-extensions.json` file.

2. Create `component`, `createPayload`, `canGoToNextStep` and `waitToCreate (optional)`. Some guidelines for `component`:

- The Component is required to only include the connection details e.g IP Address, username, password, etc related to the external storage. The StorageClass field is generic for all external Providers and is not required to be duplicated by any external vendor's Component.
- The Component must use the [Patternfly's form components](https://www.patternfly.org/v4/components/form) e.g `FormGroup`, `TextInput`, `Radio` to make the design consistent with the rest of the wizard and OpenShift console.
- All form components should be controlled forms i.e using `onChange` event handler to control the value of the input elements.
- The component should externalize the strings for i18n. [See usage](https://github.com/openshift/console/blob/master/frontend/packages/ceph-storage-plugin/src/components/ocs-install/existing-cluster-modal.tsx#L17).

#### Example:

```js
/* Add new state for the Component*/

export type ExternalState = {} | RHCSState | ABCState; // new state

export type RHCSState = {
  fileData: string,
  isRejected: boolean,
  isLoading: boolean,
  fileName: string,
};

export type ABCStorageState = {
  // new state
  username: string,
  nodes: string,
};
```

```js
/* Create `Component`, `createPayload` and  `canGoToNextStep` */

import * as React from 'react';
import { Form, FormGroup, TextInput } from '@patternfly/react-core';

import { ComponentProps, CreatePayload, ABCStorageState } from '../types';

export const ABCStorage: React.FC<ExternalComponentProps<ABCStorageState>> = ({
  form,
  setForm,
  t,
}) => {
  return (
    <Form>
      <FormGroup
        label={t('ceph-storage-plugin~Username')}
        fieldId="username-input"
      >
        <TextInput
          id="username-input"
          value={form.username}
          type="text"
          onChange={(value: string) => setForm('username', value)}
        />
      </FormGroup>
    </Form>
  );
};

export const createAbcPayload: CreatePayload<ABCStorageState> = (
  name,
  storageClass,
  form,
  model
) => [
  {
    model,
    payload: {
      apiVersion: model.version,
      kind: model.kind,
      metadata: {
        name,
      },
      spec: {
        storageClass,
        username: form.username,
      },
    },
  },
];

export const abcCanGoToNextStep: CanGoToNextStep<ABCStorageState> = (state) =>
  !!state.userName;
```

```js
/** Importing all the `codeRef`s in your plugin's `console-plugin.json` file */
{
  ...
  "exposedModules": {
    "externalStorage": "<PATH_TO_ALL_REFS>"
  }
}

/** Adding the new entry into External Storage (`console-extensions.json` file for your plugin) */
  {
    "type": "odf.wizard/storageclass",
    "properties": {
      "displayName": "ABC Storage",
      "model": {
        "apiGroup": "abc.openshift.io",
        "apiVersion": "v1",
        "kind": "ABC",
        "plural": "ABCs"
      },
      "component": {
        "$codeRef": "externalStorage.ABCStorage"
      },
      "createPayload": {
        "$codeRef": "externalStorage.createAbcPayload"
      },
      "canGoToNextStep": {
        "$codeRef": "externalStorage.abcCanGoToNextStep"
      }
    }
  }
```
