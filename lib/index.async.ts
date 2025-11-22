// Re-export all types from the generated types file
export type {
  // EC2 Types
  EC2InstanceType,
  EC2InstanceFamily,
  EC2Category,
  EC2Hypervisor,
  EC2ProcessorArchitecture,
  EC2Processor,
  EC2OperatingSystem,
  EC2Accelerator,
  BandwidthSpec,
  VolumeLimitSpec,
  EC2NetworkSpec,
  EC2EBSSpec,
  EC2InstanceStoreSpec,
  EC2SecuritySpec,
  EC2InstanceDetails,
  EC2FamilyData,
  EC2Info,
  // RDS Types
  RDSInstanceClass,
  RDSInstanceFamily,
  RDSCategory,
  RDSInstanceDetails,
  RDSFamilyData,
  RDSInfo,
  // Elasticache Types
  ElastiCacheNodeType,
  ElastiCacheFamily,
  ElastiCacheCategory,
  ElastiCacheNodeDetails,
  ElastiCacheFamilyData,
  ElastiCacheInfo,
} from './types.js'

// Re-export cache size constants
export {
  EC2_INSTANCE_CACHE_SIZE,
  EC2_FAMILY_CACHE_SIZE,
  RDS_INSTANCE_CACHE_SIZE,
  RDS_FAMILY_CACHE_SIZE,
  ELASTICACHE_NODE_CACHE_SIZE,
  ELASTICACHE_FAMILY_CACHE_SIZE,
} from './constants.js'

// Re-export all async EC2 functions
export {
  getEC2Info,
  getEC2InstanceInfo,
  getEC2Family,
  getEC2FamilyInstanceTypes,
  getEC2FamilyCategory,
  getAllEC2Families,
  getAllEC2InstanceTypes,
  getAllEC2Categories,
  isValidEC2InstanceType,
  isValidEC2Family,
  getEC2Instances,
  getEC2Families,
  clearEC2Cache,
  getEC2CacheStats,
} from './ec2.async.js'

// Re-export all async RDS functions
export {
  getRDSInfo,
  getRDSInstanceInfo,
  getRDSFamily,
  getRDSFamilyInstanceClasses,
  getRDSFamilyCategory,
  getAllRDSFamilies,
  getAllRDSInstanceClasses,
  getAllRDSCategories,
  isValidRDSInstanceClass,
  isValidRDSFamily,
  getRDSInstances,
  getRDSFamilies,
  clearRDSCache,
  getRDSCacheStats,
} from './rds.async.js'

// Re-export all async Elasticache functions
export {
  getElastiCacheInfo,
  getElastiCacheNodeInfo,
  getElastiCacheFamily,
  getElastiCacheFamilyNodeTypes,
  getElastiCacheFamilyCategory,
  getAllElastiCacheFamilies,
  getAllElastiCacheNodeTypes,
  getAllElastiCacheCategories,
  isValidElastiCacheNodeType,
  isValidElastiCacheFamily,
  getElastiCacheNodes,
  getElastiCacheFamilies,
  clearElastiCacheCache,
  getElastiCacheCacheStats,
} from './elasticache.async.js'
