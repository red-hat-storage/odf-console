# Day-2 local Scale cluster operations

## Problem Statement

After creating a connection to an external IBM Storage Scale system, an administrator can see the local Scale cluster on the dashboard but cannot manage two important Day-2 operations from that view:

- expand the local node set when additional OpenShift worker nodes should participate; or
- enable or disable the encryption configuration used to access encrypted remote filesystems.

Administrators must currently leave the dashboard and manipulate Kubernetes or Scale resources themselves. This makes routine operations harder to discover and separates them from the local Scale cluster information introduced by PR #2923.

## Solution

Add the node-expansion and encryption entry points shown in the approved UX to the Local StorageCluster dashboard card.

For node expansion, the administrator opens the add-nodes modal, selects one or more expansion candidates, waits for the existing kernel-devel eligibility check, and adds the eligible nodes. A successful label patch immediately makes a node an assigned node; Scale activation remains an asynchronous side effect.

For encryption, the administrator opens an inline modal from the card. When encryption is disabled, the modal exposes the complete setup form already used during initial connection creation. Saving creates the UI-owned credentials Secret, optional certificate ConfigMap, and `EncryptionConfig`. When encryption is enabled, the modal displays the non-secret configuration read-only and lets the administrator disable it by clearing **Enable data encryption** and saving, without a separate confirmation. Disabling deletes only the resources created by the UI.

The dashboard intentionally presents encryption as a binary state: **Enabled** when the expected `EncryptionConfig` exists and **Disabled** when it does not.

## User Stories

1. As a storage administrator, I want to open node expansion from the local Scale cluster card, so that I can manage the local node set where I already see it.
2. As a storage administrator, I want to see only expansion candidates, so that nodes already assigned to Scale do not clutter the selection table.
3. As a storage administrator, I want node expansion limited to worker nodes, so that unsupported control-plane nodes are not offered.
4. As a storage administrator, I want to select one or more expansion candidates, so that I can perform small or large expansions in one operation.
5. As a storage administrator, I want **Add** disabled until I select a node, so that I cannot submit an empty operation.
6. As a storage administrator, I want every selected node checked for kernel-devel eligibility, so that Scale is not assigned to an improperly configured node.
7. As a storage administrator, I want the existing checking, warning, error, and success presentation from PR #2945, so that Day-1 and Day-2 eligibility feedback is consistent.
8. As a storage administrator, I want **Add** disabled while eligibility is unknown or unsuccessful, so that only verified nodes can be submitted.
9. As a storage administrator, I want an eligible node assigned when its Scale daemon-selector label is patched successfully, so that the dashboard responds immediately to the accepted operation.
10. As a storage administrator, I want the inventory count to update from assigned nodes without waiting for Scale activation, so that the asynchronous operator work does not block the UI.
11. As a storage administrator, I want the modal to close after every requested node is assigned, so that a fully successful operation has a clear completion point.
12. As a storage administrator, I want successful assignments preserved when another node fails, so that completed work is not rolled back after Scale may have started reconciliation.
13. As a storage administrator, I want failed node names to remain visible and retryable after a partial failure, so that I can recover without reselecting successful nodes.
14. As a storage administrator, I want the edit affordance to remain usable when no expansion candidates exist, so that the absence of candidates is discoverable rather than looking like a permission problem.
15. As a storage administrator, I want a small **No nodes available to add** empty state with a usable **Cancel** action, so that the no-candidate state is clear.
16. As a storage administrator, I want the card to say **Disabled** when no encryption configuration exists, so that the current state is immediately understandable.
17. As a storage administrator, I want to open encryption setup from the local Scale cluster card, so that the Day-2 operation is available in context.
18. As a storage administrator, I want encryption setup to use the complete initial-setup form, so that I can provide everything required by the Scale key server.
19. As a storage administrator, I want username, password, server information, tenant ID, client, and Remote RKM validated as required, so that an incomplete configuration cannot be submitted.
20. As a storage administrator, I want port and CA certificate to remain optional, so that I can use the Scale default port and environments that do not require a supplied CA.
21. As a storage administrator, I want an omitted port to use Scale's `9443` default, so that the UI matches the platform contract.
22. As a storage administrator, I want **Save** disabled until the revealed encryption form is valid, so that malformed resources are not created.
23. As a storage administrator, I want credentials stored in a Secret and a supplied certificate stored in a ConfigMap, so that the `EncryptionConfig` references Kubernetes resources rather than embedding credentials.
24. As a storage administrator, I want encryption supporting resources created before the `EncryptionConfig`, so that the operator does not reconcile references that do not yet exist.
25. As a storage administrator, I want a failed enable attempt to roll back resources created by that attempt where possible, so that retrying does not leave avoidable partial state.
26. As a storage administrator, I want the setup modal to remain open and show an error after an enable failure, so that I can correct or retry the operation.
27. As a storage administrator, I want the card to show **Enabled** as soon as the expected `EncryptionConfig` exists, so that the UI follows the approved binary UX without waiting for asynchronous reconciliation.
28. As a storage administrator, I want existing non-secret encryption settings visible but read-only, so that I can inspect the configuration without accidentally editing an unsupported Day-2 operation.
29. As a storage administrator, I want credentials represented as masked without retrieving their values, so that the UI does not expose stored secrets.
30. As a storage administrator, I want **Save** disabled while encryption remains checked, so that opening the modal cannot rewrite an existing configuration.
31. As a storage administrator, I want to disable encryption by clearing **Enable data encryption** and saving, so that the interaction exactly follows the approved UX.
32. As a storage administrator, I want disabling encryption to proceed without another confirmation dialog, so that the modal itself is the complete interaction.
33. As a storage administrator, I want configuration details hidden after clearing the encryption control, so that the form clearly communicates deletion rather than editing.
34. As a storage administrator, I want only UI-created encryption resources deleted, so that the console does not attempt broader Scale key-server administration.
35. As a storage administrator, I want the `EncryptionConfig` deleted before its supporting resources, so that the card promptly changes to **Disabled** and the operator stops using those references.
36. As a storage administrator, I want supporting-resource cleanup errors reported without recreating the `EncryptionConfig`, so that the requested disabled state is preserved.

## Implementation Decisions

- Extend the Local StorageCluster dashboard card introduced by PR #2923 with the edit affordances and modal interactions shown in the approved UX.
- Use the established domain terms: local Scale cluster, local node set, node expansion, expansion candidate, eligible expansion node, assigned node, and encryption configuration.
- Reuse the existing node-selection and node-label payload behavior instead of introducing a second node-assignment contract.
- Derive expansion candidates from worker nodes that do not already carry the local Scale cluster's daemon-selector label. Do not show assigned nodes as disabled rows.
- Do not offer an **Include control plane nodes** option. Compact-cluster control-plane behavior is outside this slice.
- Reuse PR #2945's MachineConfigNode/MachineConfig kernel-devel eligibility check and its status presentation. Node assignment remains unavailable while checks are pending or unsuccessful.
- Permit one or more selected nodes; existing-cluster expansion has no minimum-three rule.
- Patch selected node labels independently and settle every request. On partial failure, keep successful patches, remove successful nodes from the candidate table, retain and name failed nodes, keep the modal open, and allow retry. Do not roll back successful label patches.
- Treat a successful label patch as assignment. Close the modal after all requested patches succeed and derive inventory immediately from assigned Nodes. Do not wait for the Scale core pod to become ready.
- Keep the node-expansion title and descriptive copy exactly aligned with the approved UX.
- Keep the inventory edit affordance active when there are no candidates. Render a small PatternFly empty state reading **No nodes available to add**, disable **Add**, and retain **Cancel**.
- Share the encryption form, validation, and payload construction with the Day-1 remote-connection creation flow. Do not maintain separate field definitions for Day-1 and Day-2.
- Correct the shared payload so `EncryptionConfig.spec.secret` references the generated credentials Secret by name rather than containing the entered password.
- Include the full encryption field set from initial setup. Require username, password, server information, tenant ID, client, and Remote RKM. Keep port and CA certificate optional; use port `9443` when it is omitted.
- Preserve the current Day-1 resource identity and naming scheme for the Scale system being viewed. Do not add singleton enforcement. Behavior spanning multiple remote-cluster connections is explicitly deferred.
- Enable encryption by creating the credentials Secret, then the optional CA certificate ConfigMap, and finally the `EncryptionConfig`.
- If enablement fails, make a best-effort rollback of only the resources created by that attempt, keep the modal open, report the error, and leave the card **Disabled**.
- Resolve the dashboard state from expected `EncryptionConfig` existence only. Display **Enabled** when it exists and **Disabled** when it does not. Do not add Configuring or Failed states and do not wait for the operator's `Success` condition.
- When configuration exists, show non-secret settings read-only. Display credentials as masked placeholders without reading secret values. Disable **Save** until the user clears **Enable data encryption**; clearing it hides the details and turns saving into deletion.
- Do not add a secondary deletion confirmation.
- Disable encryption by deleting the `EncryptionConfig` first, followed by the UI-created credentials Secret and certificate ConfigMap. Delete no resources outside this owned set.
- Report supporting-resource cleanup failures but do not recreate the deleted `EncryptionConfig`.
- Do not run `mmkeyserv` commands or attempt to deregister clients, tenants, or servers from the Scale cluster. Those platform cleanup steps remain an administrator concern outside the UI flow.

## Testing Decisions

- Test externally observable behavior rather than component state or private helper implementation. Assertions should cover what the administrator can see, which actions are enabled, and which Kubernetes requests result from those actions.
- Use two user-facing component seams: the add-nodes modal and the encryption modal/card flow. Mock Kubernetes watches and mutations at their public boundaries.
- For node expansion, cover candidate filtering, worker-only behavior, empty state, selection gating, eligibility states from PR #2945, successful multi-node assignment, immediate inventory behavior, partial mutation failure, retained successes, named failures, and retry.
- For encryption, cover the Disabled and Enabled card states, initial unchecked setup state, complete field validation, optional port and certificate behavior, default port behavior, Secret-name references, ordered resource creation, successful enablement, rollback at each failure point, read-only enabled state, masked credentials, uncheck-to-disable behavior, deletion without confirmation, ordered deletion, and supporting-resource cleanup failure.
- Reuse the dashboard card tests as prior art for mocked resource watches and visible status assertions.
- Reuse the existing remote-connection creation tests and payload tests as prior art for encryption form behavior and Kubernetes request assertions.
- Reuse existing node payload tests as prior art for node-label mutation behavior.
- Do not make tests wait for Scale operator reconciliation or core-pod readiness; those asynchronous platform effects are outside the UI completion contract.

## Out of Scope

- Filesystem used-capacity and total-capacity metrics; those belong to a separate metrics story.
- Removing nodes from the local node set.
- Editing fields of an existing encryption configuration.
- Configuring or exposing control-plane nodes, including compact-cluster exceptions.
- Defining, enforcing, or reconciling encryption behavior across multiple remote-cluster connections.
- Enforcing a singleton `EncryptionConfig`.
- Waiting for or representing `EncryptionConfig` reconciliation conditions such as Configuring, Success, or Failed.
- Waiting for a new Scale core pod to become ready after node assignment.
- Performing Scale-side encryption cleanup with `mmkeyserv`.
- Deleting encryption resources that were not created by this UI flow.

## Further Notes

- PR #2923 supplies the Local StorageCluster dashboard card and existing inventory/encryption status presentation on which this work builds.
- PR #2945 supplies the kernel-devel eligibility behavior that node expansion must reuse.
- IBM documents node expansion as applying the local cluster's node-selector label, after which the Scale operator creates a core pod asynchronously. The UI therefore treats label-patch success as assignment rather than waiting for activation.
- IBM's full encryption removal procedure continues beyond deleting the Kubernetes custom resource and includes `mmkeyserv` client, tenant, and possibly server cleanup. This spec intentionally limits deletion to the three UI-created Kubernetes resources.
- The platform documentation does not publish a reconciliation-time guarantee for an `EncryptionConfig`. The approved binary UX intentionally reflects resource existence rather than reconciliation completion.

References:

- [IBM Storage Scale Container Native — Adding nodes to an existing cluster](https://www.ibm.com/docs/en/scalecontainernative/6.0.0?topic=nodes-adding-new-existing-cluster)
- [IBM Storage Scale Container Native — Deployment considerations](https://www.ibm.com/docs/en/scalecontainernative/6.0.0?topic=planning-deployment-considerations)
- [IBM Storage Scale Container Native — Encryption](https://www.ibm.com/docs/en/scalecontainernative/6.0.1?topic=resources-encryption)
