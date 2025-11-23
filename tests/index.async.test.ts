import { describe, expect, it } from 'vitest'

import * as indexAsync from '../lib/index.async.js'

describe('Index Async Module Exports', () => {
  describe('Constants', () => {
    it('should export EC2_INSTANCE_CACHE_SIZE', () => {
      expect(typeof indexAsync.EC2_INSTANCE_CACHE_SIZE).toBe('number')
    })

    it('should export EC2_FAMILY_CACHE_SIZE', () => {
      expect(typeof indexAsync.EC2_FAMILY_CACHE_SIZE).toBe('number')
    })

    it('should export RDS_INSTANCE_CACHE_SIZE', () => {
      expect(typeof indexAsync.RDS_INSTANCE_CACHE_SIZE).toBe('number')
    })

    it('should export RDS_FAMILY_CACHE_SIZE', () => {
      expect(typeof indexAsync.RDS_FAMILY_CACHE_SIZE).toBe('number')
    })

    it('should export ELASTICACHE_NODE_CACHE_SIZE', () => {
      expect(typeof indexAsync.ELASTICACHE_NODE_CACHE_SIZE).toBe('number')
    })

    it('should export ELASTICACHE_FAMILY_CACHE_SIZE', () => {
      expect(typeof indexAsync.ELASTICACHE_FAMILY_CACHE_SIZE).toBe('number')
    })
  })

  describe('EC2 Async Functions', () => {
    it('should export getEC2Info as async function', () => {
      expect(typeof indexAsync.getEC2Info).toBe('function')
    })

    it('should export getEC2InstanceInfo as async function', () => {
      expect(typeof indexAsync.getEC2InstanceInfo).toBe('function')
    })

    it('should export getEC2Family as async function', () => {
      expect(typeof indexAsync.getEC2Family).toBe('function')
    })

    it('should export getEC2FamilyInstanceTypes as async function', () => {
      expect(typeof indexAsync.getEC2FamilyInstanceTypes).toBe('function')
    })

    it('should export getEC2FamilyCategory as async function', () => {
      expect(typeof indexAsync.getEC2FamilyCategory).toBe('function')
    })

    it('should export getAllEC2Families as async function', () => {
      expect(typeof indexAsync.getAllEC2Families).toBe('function')
    })

    it('should export getAllEC2InstanceTypes as async function', () => {
      expect(typeof indexAsync.getAllEC2InstanceTypes).toBe('function')
    })

    it('should export getAllEC2Categories as async function', () => {
      expect(typeof indexAsync.getAllEC2Categories).toBe('function')
    })

    it('should export isValidEC2InstanceType as async function', () => {
      expect(typeof indexAsync.isValidEC2InstanceType).toBe('function')
    })

    it('should export isValidEC2Family as async function', () => {
      expect(typeof indexAsync.isValidEC2Family).toBe('function')
    })

    it('should export getEC2Instances as async function', () => {
      expect(typeof indexAsync.getEC2Instances).toBe('function')
    })

    it('should export getEC2Families as async function', () => {
      expect(typeof indexAsync.getEC2Families).toBe('function')
    })

    it('should export clearEC2Cache', () => {
      expect(typeof indexAsync.clearEC2Cache).toBe('function')
    })

    it('should export getEC2CacheStats', () => {
      expect(typeof indexAsync.getEC2CacheStats).toBe('function')
    })
  })

  describe('RDS Async Functions', () => {
    it('should export getRDSInfo as async function', () => {
      expect(typeof indexAsync.getRDSInfo).toBe('function')
    })

    it('should export getRDSInstanceInfo as async function', () => {
      expect(typeof indexAsync.getRDSInstanceInfo).toBe('function')
    })

    it('should export getRDSFamily as async function', () => {
      expect(typeof indexAsync.getRDSFamily).toBe('function')
    })

    it('should export getRDSFamilyInstanceClasses as async function', () => {
      expect(typeof indexAsync.getRDSFamilyInstanceClasses).toBe('function')
    })

    it('should export getRDSFamilyCategory as async function', () => {
      expect(typeof indexAsync.getRDSFamilyCategory).toBe('function')
    })

    it('should export getAllRDSFamilies as async function', () => {
      expect(typeof indexAsync.getAllRDSFamilies).toBe('function')
    })

    it('should export getAllRDSInstanceClasses as async function', () => {
      expect(typeof indexAsync.getAllRDSInstanceClasses).toBe('function')
    })

    it('should export getAllRDSCategories as async function', () => {
      expect(typeof indexAsync.getAllRDSCategories).toBe('function')
    })

    it('should export isValidRDSInstanceClass as async function', () => {
      expect(typeof indexAsync.isValidRDSInstanceClass).toBe('function')
    })

    it('should export isValidRDSFamily as async function', () => {
      expect(typeof indexAsync.isValidRDSFamily).toBe('function')
    })

    it('should export getRDSInstances as async function', () => {
      expect(typeof indexAsync.getRDSInstances).toBe('function')
    })

    it('should export getRDSFamilies as async function', () => {
      expect(typeof indexAsync.getRDSFamilies).toBe('function')
    })

    it('should export clearRDSCache', () => {
      expect(typeof indexAsync.clearRDSCache).toBe('function')
    })

    it('should export getRDSCacheStats', () => {
      expect(typeof indexAsync.getRDSCacheStats).toBe('function')
    })
  })

  describe('ElastiCache Async Functions', () => {
    it('should export getElastiCacheInfo as async function', () => {
      expect(typeof indexAsync.getElastiCacheInfo).toBe('function')
    })

    it('should export getElastiCacheNodeInfo as async function', () => {
      expect(typeof indexAsync.getElastiCacheNodeInfo).toBe('function')
    })

    it('should export getElastiCacheFamily as async function', () => {
      expect(typeof indexAsync.getElastiCacheFamily).toBe('function')
    })

    it('should export getElastiCacheFamilyNodeTypes as async function', () => {
      expect(typeof indexAsync.getElastiCacheFamilyNodeTypes).toBe('function')
    })

    it('should export getElastiCacheFamilyCategory as async function', () => {
      expect(typeof indexAsync.getElastiCacheFamilyCategory).toBe('function')
    })

    it('should export getAllElastiCacheFamilies as async function', () => {
      expect(typeof indexAsync.getAllElastiCacheFamilies).toBe('function')
    })

    it('should export getAllElastiCacheNodeTypes as async function', () => {
      expect(typeof indexAsync.getAllElastiCacheNodeTypes).toBe('function')
    })

    it('should export getAllElastiCacheCategories as async function', () => {
      expect(typeof indexAsync.getAllElastiCacheCategories).toBe('function')
    })

    it('should export isValidElastiCacheNodeType as async function', () => {
      expect(typeof indexAsync.isValidElastiCacheNodeType).toBe('function')
    })

    it('should export isValidElastiCacheFamily as async function', () => {
      expect(typeof indexAsync.isValidElastiCacheFamily).toBe('function')
    })

    it('should export getElastiCacheNodes as async function', () => {
      expect(typeof indexAsync.getElastiCacheNodes).toBe('function')
    })

    it('should export getElastiCacheFamilies as async function', () => {
      expect(typeof indexAsync.getElastiCacheFamilies).toBe('function')
    })

    it('should export clearElastiCacheCache', () => {
      expect(typeof indexAsync.clearElastiCacheCache).toBe('function')
    })

    it('should export getElastiCacheCacheStats', () => {
      expect(typeof indexAsync.getElastiCacheCacheStats).toBe('function')
    })
  })
})
