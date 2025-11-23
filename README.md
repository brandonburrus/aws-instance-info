[![Tests Passing](https://github.com/brandonburrus/aws-instance-info/actions/workflows/nightly-tests.yml/badge.svg?branch=main)](https://github.com/brandonburrus/aws-instance-info/actions/workflows/nightly-tests.yml)

Get detailed specifications for AWS EC2 instances, RDS instance classes, and ElastiCache node types.

## Installation

```bash
npm install aws-instance-info
```

## Features

- Get info for both Instances and Instance Families
- Supports EC2, RDS, and ElastiCache
- Full TypeScript support with type definitions built-in

## Documentation

Full API documentation can be found at [awsinstanceinfo.brandonburrus.com](https://awsinstanceinfo.brandonburrus.com).

## Examples

### EC2

Get details for a specific EC2 instance type:

```typescript
import { getEC2InstanceInfo } from 'aws-instance-info';

const m5Large = getEC2InstanceInfo('m5.large');
console.log(m5Large.memoryGiB);  // 8
console.log(m5Large.vCPUs);      // 2
console.log(m5Large.category);   // 'general_purpose'
```

NOTE: By default, the API loads data from disk synchronously. If you prefer async, you can use the async API from `aws-instance-info/async`.

```typescript
import { getEC2InstanceInfo } from 'aws-instance-info/async';

const m5Large = await getEC2InstanceInfo('m5.large');
console.log(m5Large.memoryGiB);  // 8
console.log(m5Large.vCPUs);      // 2
console.log(m5Large.category);   // 'general_purpose'
```

Get details for an entire EC2 instance family:

```typescript
import { getEC2Family } from 'aws-instance-info';

const m5Family = getEC2Family('M5');
console.log(m5Family.instanceTypes);  // ['m5.large', 'm5.xlarge', ...]
console.log(m5Family.hypervisor);     // 'Nitro v2'
```

### RDS

Get details for a specific RDS instance class:

```typescript
import { getRDSInstanceInfo } from 'aws-instance-info';

const dbM5Large = getRDSInstanceInfo('db.m5.large');
console.log(dbM5Large.memoryGiB);  // 8
console.log(dbM5Large.vCPUs);      // 2
console.log(dbM5Large.category);   // 'general_purpose'
```

### ElastiCache

Get details for a specific ElastiCache node type:

```typescript
import { getElastiCacheNodeInfo } from 'aws-instance-info';

const cacheM5Large = getElastiCacheNodeInfo('cache.m5.large');
console.log(cacheM5Large.memoryGiB);   // 6.38
console.log(cacheM5Large.vCPUs);       // 2
console.log(cacheM5Large.category);    // 'general_purpose'
```

## FAQ

Q: Where does the data come from?
The data is sourced from the official AWS documentation and is updated regularly to reflect any changes made by AWS.
This process is completely automated via the python scripts as part of this project.

Q: How is the data stored?
The data is stored in JSON files within the package, allowing for quick and efficient access. These loaded and cached on-demand in memory.

