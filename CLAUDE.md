# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ec2-details** is an ESM TypeScript library providing meta-information about AWS EC2 instances, RDS instance classes, and Elasticache node types (specs, networking, EBS, security, instance store). Uses lazy-loading with LRU caching.

## Architecture

```
lib/
  index.ts        # Main entry: re-exports all from ec2.ts, rds.ts, elasticache.ts
  ec2.ts          # EC2 API: getEC2Instance, getEC2Family, getEC2Info, etc.
  rds.ts          # RDS API: getRDSInstance, getRDSFamily, getRDSInfo, etc.
  elasticache.ts  # Elasticache API: getElastiCacheNode, getElastiCacheFamily, etc.
  types.ts        # Auto-generated TypeScript types (DO NOT EDIT)

data/             # Generated JSON data (DO NOT EDIT)
  ec2/
    info.json     # Manifest of all EC2 families, instances, categories
    families/     # ~150 JSON files (one per EC2 family: M5.json, C7.json, etc.)
    instances/    # ~1000 JSON files (one per instance type: m5.large.json, etc.)
  rds/
    info.json     # Manifest of all RDS families, instances, categories
    families/     # ~40 JSON files (one per RDS family: M5.json, R6g.json, etc.)
    instances/    # ~350 JSON files (one per instance class: db.m5.large.json, etc.)
  elasticache/
    info.json     # Manifest of all Elasticache families, node types, categories
    families/     # ~13 JSON files (one per family: M5.json, R6g.json, etc.)
    nodes/        # ~73 JSON files (one per node type: cache.m5.large.json, etc.)

scripts/
  generate.py     # Scrapes AWS EC2, RDS, and Elasticache docs, generates data/ and lib/types.ts
```

## Data Generation Pipeline

`scripts/generate.py` scrapes AWS EC2, RDS, and Elasticache documentation and outputs:
1. EC2 instance JSON files (`data/ec2/instances/*.json`)
2. EC2 family JSON files with aggregated specs (`data/ec2/families/*.json`)
3. EC2 info manifest (`data/ec2/info.json`)
4. RDS instance JSON files (`data/rds/instances/*.json`)
5. RDS family JSON files with aggregated specs (`data/rds/families/*.json`)
6. RDS info manifest (`data/rds/info.json`)
7. Elasticache node JSON files (`data/elasticache/nodes/*.json`)
8. Elasticache family JSON files (`data/elasticache/families/*.json`)
9. Elasticache info manifest (`data/elasticache/info.json`)
10. TypeScript union types and interfaces (`lib/types.ts`)

Run with: `(cd scripts && uv run generate.py)`

## Code Style

- **Formatter**: Biome (single quotes, semicolons as-needed, 2-space indent)
- **Commits**: Conventional commits enforced by commitlint
- **Pre-commit**: Husky runs lint-staged (biome check --write)

## Key Types

All JSON keys and TypeScript interfaces use **camelCase**:
- `instanceType`, `familySummary`, `memoryGiB`, `vCPUs`, `bandwidthGbps`, `ebsEncryption`, `nitroTPM`

### EC2 Types
- `EC2InstanceType` - all valid instance type strings (e.g., "m5.large")
- `EC2InstanceFamily` - all valid family strings (e.g., "M5")
- `EC2Category` - general_purpose, compute_optimized, memory_optimized, storage_optimized, accelerated_computing, hpc
- `EC2InstanceDetails`, `EC2FamilyData`, `EC2Info` - main data interfaces

### RDS Types
- `RDSInstanceClass` - all valid instance class strings (e.g., "db.m5.large")
- `RDSInstanceFamily` - all valid family strings (e.g., "M5")
- `RDSCategory` - general_purpose, memory_optimized, compute_optimized, burstable_performance
- `RDSInstanceDetails`, `RDSFamilyData`, `RDSInfo` - main data interfaces

### Elasticache Types
- `ElastiCacheNodeType` - all valid node type strings (e.g., "cache.m5.large")
- `ElastiCacheFamily` - all valid family strings (e.g., "M5")
- `ElastiCacheCategory` - general_purpose, memory_optimized, network_optimized, burstable_performance
- `ElastiCacheNodeDetails`, `ElastiCacheFamilyData`, `ElastiCacheInfo` - main data interfaces

## API Functions

### EC2 Functions
- `getEC2Instance(type)` - Get details for a specific EC2 instance type
- `getEC2Family(family)` - Get all data for an EC2 instance family
- `getEC2Info()` - Get manifest of all EC2 families, instances, categories
- `getAllEC2Families()`, `getAllEC2InstanceTypes()`, `getAllEC2Categories()`
- `isValidEC2InstanceType(type)`, `isValidEC2Family(family)`
- `getEC2Instances(types[])`, `getEC2Families(families[])` - Batch operations
- `clearEC2Cache()`, `getEC2CacheStats()`

### RDS Functions
- `getRDSInstance(class)` - Get details for a specific RDS instance class
- `getRDSFamily(family)` - Get all data for an RDS instance family
- `getRDSInfo()` - Get manifest of all RDS families, instances, categories
- `getAllRDSFamilies()`, `getAllRDSInstanceClasses()`, `getAllRDSCategories()`
- `isValidRDSInstanceClass(class)`, `isValidRDSFamily(family)`
- `getRDSInstances(classes[])`, `getRDSFamilies(families[])` - Batch operations
- `clearRDSCache()`, `getRDSCacheStats()`

### Elasticache Functions
- `getElastiCacheNode(nodeType)` - Get details for a specific Elasticache node type
- `getElastiCacheFamily(family)` - Get all data for an Elasticache node family
- `getElastiCacheInfo()` - Get manifest of all Elasticache families, node types, categories
- `getAllElastiCacheFamilies()`, `getAllElastiCacheNodeTypes()`, `getAllElastiCacheCategories()`
- `isValidElastiCacheNodeType(nodeType)`, `isValidElastiCacheFamily(family)`
- `getElastiCacheNodes(nodeTypes[])`, `getElastiCacheFamilies(families[])` - Batch operations
- `clearElastiCacheCache()`, `getElastiCacheCacheStats()`
