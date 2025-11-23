import { existsSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  EC2_DATA_DIR,
  clearEC2Cache,
  familyCache,
  getEC2CacheStats,
  infoCacheHolder,
  instanceCache,
} from '../lib/ec2.cache.js'
import type {
  EC2FamilyData,
  EC2Info,
  EC2InstanceDetails,
} from '../lib/types.js'

describe('EC2 Cache Module', () => {
  beforeEach(() => {
    clearEC2Cache()
  })

  afterEach(() => {
    clearEC2Cache()
  })

  describe('EC2_DATA_DIR', () => {
    it('should be a valid path', () => {
      expect(typeof EC2_DATA_DIR).toBe('string')
      expect(EC2_DATA_DIR.length).toBeGreaterThan(0)
    })

    it('should point to an existing directory', () => {
      expect(existsSync(EC2_DATA_DIR)).toBe(true)
    })

    it('should contain data/ec2 in the path', () => {
      expect(EC2_DATA_DIR).toContain('data')
      expect(EC2_DATA_DIR).toContain('ec2')
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
      const testData = { instanceType: 'test.large' } as EC2InstanceDetails
      instanceCache.set('test.large', testData)

      expect(instanceCache.get('test.large')).toBe(testData)
    })

    it('should return undefined for non-existent keys', () => {
      expect(instanceCache.get('non.existent')).toBeUndefined()
    })

    it('should be cleared by clearEC2Cache', () => {
      instanceCache.set('test.large', {} as EC2InstanceDetails)
      expect(instanceCache.size).toBe(1)

      clearEC2Cache()
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
      const testData = { family: 'TEST' } as EC2FamilyData
      familyCache.set('TEST', testData)

      expect(familyCache.get('TEST')).toBe(testData)
    })

    it('should return undefined for non-existent keys', () => {
      expect(familyCache.get('NONEXISTENT')).toBeUndefined()
    })

    it('should be cleared by clearEC2Cache', () => {
      familyCache.set('TEST', {} as EC2FamilyData)
      expect(familyCache.size).toBe(1)

      clearEC2Cache()
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
      } as EC2Info
      infoCacheHolder.value = testInfo

      expect(infoCacheHolder.value).toBe(testInfo)
    })

    it('should be cleared by clearEC2Cache', () => {
      infoCacheHolder.value = {
        families: [],
        instances: [],
        categories: [],
      } as EC2Info
      expect(infoCacheHolder.value).not.toBeNull()

      clearEC2Cache()
      expect(infoCacheHolder.value).toBeNull()
    })
  })

  describe('clearEC2Cache', () => {
    it('should clear all caches', () => {
      // Populate caches
      instanceCache.set('test.large', {} as EC2InstanceDetails)
      familyCache.set('TEST', {} as EC2FamilyData)
      infoCacheHolder.value = {
        families: [],
        instances: [],
        categories: [],
      } as EC2Info

      expect(instanceCache.size).toBe(1)
      expect(familyCache.size).toBe(1)
      expect(infoCacheHolder.value).not.toBeNull()

      // Clear
      clearEC2Cache()

      expect(instanceCache.size).toBe(0)
      expect(familyCache.size).toBe(0)
      expect(infoCacheHolder.value).toBeNull()
    })

    it('should not throw when caches are already empty', () => {
      expect(() => clearEC2Cache()).not.toThrow()
    })
  })

  describe('getEC2CacheStats', () => {
    it('should return correct stats for empty cache', () => {
      const stats = getEC2CacheStats()

      expect(stats).toEqual({
        instances: 0,
        families: 0,
        infoLoaded: false,
      })
    })

    it('should return correct instance count', () => {
      instanceCache.set('test1.large', {} as EC2InstanceDetails)
      instanceCache.set('test2.large', {} as EC2InstanceDetails)

      const stats = getEC2CacheStats()
      expect(stats.instances).toBe(2)
    })

    it('should return correct family count', () => {
      familyCache.set('TEST1', {} as EC2FamilyData)
      familyCache.set('TEST2', {} as EC2FamilyData)
      familyCache.set('TEST3', {} as EC2FamilyData)

      const stats = getEC2CacheStats()
      expect(stats.families).toBe(3)
    })

    it('should return infoLoaded as true when info is cached', () => {
      infoCacheHolder.value = {
        families: [],
        instances: [],
        categories: [],
      } as EC2Info

      const stats = getEC2CacheStats()
      expect(stats.infoLoaded).toBe(true)
    })

    it('should return infoLoaded as false when info is not cached', () => {
      const stats = getEC2CacheStats()
      expect(stats.infoLoaded).toBe(false)
    })
  })
})
