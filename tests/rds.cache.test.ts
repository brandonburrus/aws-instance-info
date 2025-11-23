import { existsSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  RDS_DATA_DIR,
  clearRDSCache,
  familyCache,
  getRDSCacheStats,
  infoCacheHolder,
  instanceCache,
} from '../lib/rds.cache.js'
import type {
  RDSFamilyData,
  RDSInfo,
  RDSInstanceDetails,
} from '../lib/types.js'

describe('RDS Cache Module', () => {
  beforeEach(() => {
    clearRDSCache()
  })

  afterEach(() => {
    clearRDSCache()
  })

  describe('RDS_DATA_DIR', () => {
    it('should be a valid path', () => {
      expect(typeof RDS_DATA_DIR).toBe('string')
      expect(RDS_DATA_DIR.length).toBeGreaterThan(0)
    })

    it('should point to an existing directory', () => {
      expect(existsSync(RDS_DATA_DIR)).toBe(true)
    })

    it('should contain data/rds in the path', () => {
      expect(RDS_DATA_DIR).toContain('data')
      expect(RDS_DATA_DIR).toContain('rds')
    })
  })

  describe('instanceCache', () => {
    it('should be an LRU cache instance', () => {
      expect(instanceCache).toBeDefined()
      expect(typeof instanceCache.get).toBe('function')
      expect(typeof instanceCache.set).toBe('function')
      expect(typeof instanceCache.clear).toBe('function')
    })

    it('should store and retrieve values', () => {
      const testData = { instanceClass: 'db.test.large' } as RDSInstanceDetails
      instanceCache.set('db.test.large', testData)

      expect(instanceCache.get('db.test.large')).toBe(testData)
    })

    it('should return undefined for non-existent keys', () => {
      expect(instanceCache.get('db.non.existent')).toBeUndefined()
    })

    it('should be cleared by clearRDSCache', () => {
      instanceCache.set('db.test.large', {} as RDSInstanceDetails)
      expect(instanceCache.size).toBe(1)

      clearRDSCache()
      expect(instanceCache.size).toBe(0)
    })
  })

  describe('familyCache', () => {
    it('should be an LRU cache instance', () => {
      expect(familyCache).toBeDefined()
      expect(typeof familyCache.get).toBe('function')
      expect(typeof familyCache.set).toBe('function')
      expect(typeof familyCache.clear).toBe('function')
    })

    it('should store and retrieve values', () => {
      const testData = { family: 'TEST' } as RDSFamilyData
      familyCache.set('TEST', testData)

      expect(familyCache.get('TEST')).toBe(testData)
    })

    it('should return undefined for non-existent keys', () => {
      expect(familyCache.get('NONEXISTENT')).toBeUndefined()
    })

    it('should be cleared by clearRDSCache', () => {
      familyCache.set('TEST', {} as RDSFamilyData)
      expect(familyCache.size).toBe(1)

      clearRDSCache()
      expect(familyCache.size).toBe(0)
    })
  })

  describe('infoCacheHolder', () => {
    it('should start with null value', () => {
      expect(infoCacheHolder.value).toBeNull()
    })

    it('should allow setting value', () => {
      const testInfo = {
        families: [],
        instances: [],
        categories: [],
      } as RDSInfo
      infoCacheHolder.value = testInfo

      expect(infoCacheHolder.value).toBe(testInfo)
    })

    it('should be cleared by clearRDSCache', () => {
      infoCacheHolder.value = {
        families: [],
        instances: [],
        categories: [],
      } as RDSInfo
      expect(infoCacheHolder.value).not.toBeNull()

      clearRDSCache()
      expect(infoCacheHolder.value).toBeNull()
    })
  })

  describe('clearRDSCache', () => {
    it('should clear all caches', () => {
      // Populate caches
      instanceCache.set('db.test.large', {} as RDSInstanceDetails)
      familyCache.set('TEST', {} as RDSFamilyData)
      infoCacheHolder.value = {
        families: [],
        instances: [],
        categories: [],
      } as RDSInfo

      expect(instanceCache.size).toBe(1)
      expect(familyCache.size).toBe(1)
      expect(infoCacheHolder.value).not.toBeNull()

      // Clear
      clearRDSCache()

      expect(instanceCache.size).toBe(0)
      expect(familyCache.size).toBe(0)
      expect(infoCacheHolder.value).toBeNull()
    })

    it('should not throw when caches are already empty', () => {
      expect(() => clearRDSCache()).not.toThrow()
    })
  })

  describe('getRDSCacheStats', () => {
    it('should return correct stats for empty cache', () => {
      const stats = getRDSCacheStats()

      expect(stats).toEqual({
        instances: 0,
        families: 0,
        infoLoaded: false,
      })
    })

    it('should return correct instance count', () => {
      instanceCache.set('db.test1.large', {} as RDSInstanceDetails)
      instanceCache.set('db.test2.large', {} as RDSInstanceDetails)

      const stats = getRDSCacheStats()
      expect(stats.instances).toBe(2)
    })

    it('should return correct family count', () => {
      familyCache.set('TEST1', {} as RDSFamilyData)
      familyCache.set('TEST2', {} as RDSFamilyData)
      familyCache.set('TEST3', {} as RDSFamilyData)

      const stats = getRDSCacheStats()
      expect(stats.families).toBe(3)
    })

    it('should return infoLoaded as true when info is cached', () => {
      infoCacheHolder.value = {
        families: [],
        instances: [],
        categories: [],
      } as RDSInfo

      const stats = getRDSCacheStats()
      expect(stats.infoLoaded).toBe(true)
    })

    it('should return infoLoaded as false when info is not cached', () => {
      const stats = getRDSCacheStats()
      expect(stats.infoLoaded).toBe(false)
    })
  })
})
