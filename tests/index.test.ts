import { describe, expect, it } from 'vitest'

import * as index from '../lib/index.js'

describe('Index Module Exports', () => {
  describe('Constants', () => {
    it('should export EC2_INSTANCE_CACHE_SIZE', () => {
      expect(typeof index.EC2_INSTANCE_CACHE_SIZE).toBe('number')
    })

    it('should export EC2_FAMILY_CACHE_SIZE', () => {
      expect(typeof index.EC2_FAMILY_CACHE_SIZE).toBe('number')
    })

    it('should export RDS_INSTANCE_CACHE_SIZE', () => {
      expect(typeof index.RDS_INSTANCE_CACHE_SIZE).toBe('number')
    })

    it('should export RDS_FAMILY_CACHE_SIZE', () => {
      expect(typeof index.RDS_FAMILY_CACHE_SIZE).toBe('number')
    })

    it('should export ELASTICACHE_NODE_CACHE_SIZE', () => {
      expect(typeof index.ELASTICACHE_NODE_CACHE_SIZE).toBe('number')
    })

    it('should export ELASTICACHE_FAMILY_CACHE_SIZE', () => {
      expect(typeof index.ELASTICACHE_FAMILY_CACHE_SIZE).toBe('number')
    })
  })

  describe('EC2 Functions', () => {
    it('should export getEC2Info', () => {
      expect(typeof index.getEC2Info).toBe('function')
    })

    it('should export getEC2InstanceInfo', () => {
      expect(typeof index.getEC2InstanceInfo).toBe('function')
    })

    it('should export getEC2Family', () => {
      expect(typeof index.getEC2Family).toBe('function')
    })

    it('should export getEC2FamilyInstanceTypes', () => {
      expect(typeof index.getEC2FamilyInstanceTypes).toBe('function')
    })

    it('should export getEC2FamilyCategory', () => {
      expect(typeof index.getEC2FamilyCategory).toBe('function')
    })

    it('should export getAllEC2Families', () => {
      expect(typeof index.getAllEC2Families).toBe('function')
    })

    it('should export getAllEC2InstanceTypes', () => {
      expect(typeof index.getAllEC2InstanceTypes).toBe('function')
    })

    it('should export getAllEC2Categories', () => {
      expect(typeof index.getAllEC2Categories).toBe('function')
    })

    it('should export isValidEC2InstanceType', () => {
      expect(typeof index.isValidEC2InstanceType).toBe('function')
    })

    it('should export isValidEC2Family', () => {
      expect(typeof index.isValidEC2Family).toBe('function')
    })

    it('should export getEC2Instances', () => {
      expect(typeof index.getEC2Instances).toBe('function')
    })

    it('should export getEC2Families', () => {
      expect(typeof index.getEC2Families).toBe('function')
    })

    it('should export clearEC2Cache', () => {
      expect(typeof index.clearEC2Cache).toBe('function')
    })

    it('should export getEC2CacheStats', () => {
      expect(typeof index.getEC2CacheStats).toBe('function')
    })
  })

  describe('RDS Functions', () => {
    it('should export getRDSInfo', () => {
      expect(typeof index.getRDSInfo).toBe('function')
    })

    it('should export getRDSInstanceInfo', () => {
      expect(typeof index.getRDSInstanceInfo).toBe('function')
    })

    it('should export getRDSFamily', () => {
      expect(typeof index.getRDSFamily).toBe('function')
    })

    it('should export getRDSFamilyInstanceClasses', () => {
      expect(typeof index.getRDSFamilyInstanceClasses).toBe('function')
    })

    it('should export getRDSFamilyCategory', () => {
      expect(typeof index.getRDSFamilyCategory).toBe('function')
    })

    it('should export getAllRDSFamilies', () => {
      expect(typeof index.getAllRDSFamilies).toBe('function')
    })

    it('should export getAllRDSInstanceClasses', () => {
      expect(typeof index.getAllRDSInstanceClasses).toBe('function')
    })

    it('should export getAllRDSCategories', () => {
      expect(typeof index.getAllRDSCategories).toBe('function')
    })

    it('should export isValidRDSInstanceClass', () => {
      expect(typeof index.isValidRDSInstanceClass).toBe('function')
    })

    it('should export isValidRDSFamily', () => {
      expect(typeof index.isValidRDSFamily).toBe('function')
    })

    it('should export getRDSInstances', () => {
      expect(typeof index.getRDSInstances).toBe('function')
    })

    it('should export getRDSFamilies', () => {
      expect(typeof index.getRDSFamilies).toBe('function')
    })

    it('should export clearRDSCache', () => {
      expect(typeof index.clearRDSCache).toBe('function')
    })

    it('should export getRDSCacheStats', () => {
      expect(typeof index.getRDSCacheStats).toBe('function')
    })
  })

  describe('ElastiCache Functions', () => {
    it('should export getElastiCacheInfo', () => {
      expect(typeof index.getElastiCacheInfo).toBe('function')
    })

    it('should export getElastiCacheNodeInfo', () => {
      expect(typeof index.getElastiCacheNodeInfo).toBe('function')
    })

    it('should export getElastiCacheFamily', () => {
      expect(typeof index.getElastiCacheFamily).toBe('function')
    })

    it('should export getElastiCacheFamilyNodeTypes', () => {
      expect(typeof index.getElastiCacheFamilyNodeTypes).toBe('function')
    })

    it('should export getElastiCacheFamilyCategory', () => {
      expect(typeof index.getElastiCacheFamilyCategory).toBe('function')
    })

    it('should export getAllElastiCacheFamilies', () => {
      expect(typeof index.getAllElastiCacheFamilies).toBe('function')
    })

    it('should export getAllElastiCacheNodeTypes', () => {
      expect(typeof index.getAllElastiCacheNodeTypes).toBe('function')
    })

    it('should export getAllElastiCacheCategories', () => {
      expect(typeof index.getAllElastiCacheCategories).toBe('function')
    })

    it('should export isValidElastiCacheNodeType', () => {
      expect(typeof index.isValidElastiCacheNodeType).toBe('function')
    })

    it('should export isValidElastiCacheFamily', () => {
      expect(typeof index.isValidElastiCacheFamily).toBe('function')
    })

    it('should export getElastiCacheNodes', () => {
      expect(typeof index.getElastiCacheNodes).toBe('function')
    })

    it('should export getElastiCacheFamilies', () => {
      expect(typeof index.getElastiCacheFamilies).toBe('function')
    })

    it('should export clearElastiCacheCache', () => {
      expect(typeof index.clearElastiCacheCache).toBe('function')
    })

    it('should export getElastiCacheCacheStats', () => {
      expect(typeof index.getElastiCacheCacheStats).toBe('function')
    })
  })
})
