# aws-instance-info

Get detailed specifications for AWS EC2 instances, RDS instance classes, and ElastiCache node types.

## Installation

```bash
npm install aws-instance-info
```

## Features

- Detailed specifications for EC2, RDS, and ElastiCache instances
- Memory, vCPUs, networking, storage, and security information
- Lazy-loading with LRU caching for performance
- TypeScript support with full type definitions
- ESM-only

## Examples

### EC2 Instances

Get details for a specific EC2 instance type:

```typescript
import { getEC2Instance } from 'aws-instance-info';

const instance = await getEC2Instance('m5.large');
console.log(instance.memoryGiB);  // 8
console.log(instance.vCPUs);      // 2
console.log(instance.category);   // 'general_purpose'
```

Get all instances in a family:

```typescript
import { getEC2Family } from 'aws-instance-info';

const family = await getEC2Family('M5');
console.log(family.instances);  // Array of all M5 instance types
console.log(family.summary);    // Family-level summary
```

### RDS Instances

Get details for a specific RDS instance class:

```typescript
import { getRDSInstance } from 'aws-instance-info';

const instance = await getRDSInstance('db.m5.large');
console.log(instance.memoryGiB);  // 8
console.log(instance.vCPUs);      // 2
console.log(instance.category);   // 'general_purpose'
```

List all RDS instance classes:

```typescript
import { getAllRDSInstanceClasses } from 'aws-instance-info';

const classes = await getAllRDSInstanceClasses();
console.log(classes);  // ['db.m5.large', 'db.m5.xlarge', ...]
```

### ElastiCache Nodes

Get details for a specific ElastiCache node type:

```typescript
import { getElastiCacheNode } from 'aws-instance-info';

const node = await getElastiCacheNode('cache.m5.large');
console.log(node.memoryGiB);   // 6.38
console.log(node.vCPUs);       // 2
console.log(node.category);    // 'general_purpose'
```
