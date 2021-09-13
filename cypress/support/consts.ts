export const KUBEADMIN_USERNAME = 'kubeadmin';
export const KUBEADMIN_IDP = 'kube:admin';
export const CATALOG = {
  NAMESPACE: 'openshift-marketplace',
  SECRET: 'ocs-secret',
  IMAGE: 'quay.io/ocs-dev/odf-operator-catalog:latest',
  DISPLAY_NAME: 'OpenShift Data Foundation [Internal]',
  NAME:  'odf-catalogsource',
};
export const NS = "openshift-storage"
export const OCS_SS = "ocs-storagecluster-storagesystem"
export const ODFCatalogSource = {
  apiVersion: 'operators.coreos.com/v1alpha1',
  kind: 'CatalogSource',
  metadata: {
    labels: {
      'odf-operator-internal': 'true',
    },
    namespace: CATALOG.NAMESPACE,
    name: CATALOG.NAME,
  },
  spec: {
    sourceType: 'grpc',
    image: CATALOG.IMAGE,
    displayName: CATALOG.DISPLAY_NAME,
    publisher: 'Red Hat',
  },
};
