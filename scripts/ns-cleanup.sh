#!/bin/bash

NAMESPACE=${NAMESPACE:-openshift-storage}

echo "Fetching remaining resources in namespace: $NAMESPACE..."

# Extract remaining resource kinds from the namespace status
REMAINING_RESOURCES=$(kubectl get namespace "$NAMESPACE" -o json | jq -r '
  .status.conditions[] |
  select(.type == "NamespaceContentRemaining" or .type == "NamespaceFinalizersRemaining") |
  .message' | awk '{for (i=1; i<=NF; i++) if ($i ~ /\./) print $i}' | sort -u)

# If no remaining resources, exit
if [[ -z "$REMAINING_RESOURCES" ]]; then
  echo "No remaining resources found for deletion."
  exit 0
fi

echo "Found remaining resources: $REMAINING_RESOURCES"

# Remove finalizers and delete resources
for resource in $REMAINING_RESOURCES; do
    echo "Processing resource: $resource"

    # Get all instances of the resource
    RESOURCE_LIST=$(kubectl get "$resource" -n "$NAMESPACE" --no-headers -o custom-columns=":metadata.name")

    for res in $RESOURCE_LIST; do
        echo "Removing finalizers for $resource/$res..."

        # Patch the resource to remove finalizers
        kubectl patch "$resource" "$res" -n "$NAMESPACE" --type='json' -p='[{"op": "remove", "path": "/metadata/finalizers"}]' || true

        echo "Deleting $resource/$res..."
        kubectl delete "$resource" "$res" -n "$NAMESPACE" --force --grace-period=0 || true
    done
done

echo "Cleanup completed for namespace: $NAMESPACE."
