# External Storage Connections

This context describes how Data Foundation connects an OpenShift environment to external IBM Storage Scale systems.

## Language

**Local Scale cluster**:
The IBM Storage Scale cluster in the OpenShift environment that mounts filesystems from remote clusters. A single local Scale cluster is shared by all remote-cluster connections in that environment.
_Avoid_: Local StorageCluster, remote cluster

**Local node set**:
The OpenShift nodes assigned to the local Scale cluster.
_Avoid_: Inventory, remote-cluster nodes

**Node expansion**:
A Day-2 operation that adds eligible OpenShift nodes to the local node set.
_Avoid_: Edit inventory, node editing

**Expansion candidate**:
An OpenShift worker node that is not already in the local node set and can be considered for node expansion. Control-plane nodes are not expansion candidates.
_Avoid_: Available node

**Eligible expansion node**:
An expansion candidate whose currently applied machine configuration includes the kernel-devel extension required by Scale.
_Avoid_: Candidate node, available node

**Assigned node**:
An OpenShift node selected by the local Scale cluster. Assignment is immediate, while Scale activates the node asynchronously.
_Avoid_: Active node, ready node

**Encryption configuration**:
A set of key-server access settings that lets the local Scale cluster access encrypted remote filesystems.
_Avoid_: Encryption toggle
