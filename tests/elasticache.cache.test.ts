import { existsSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  ELASTICACHE_DATA_DIR,
  clearElastiCacheCache,
  familyCache,
  getElastiCacheCacheStats,
  infoCacheHolder,
  nodeCache,
} from '../lib/elasticache.cache.js'
import type {
  ElastiCacheFamilyData,
  ElastiCacheInfo,
  ElastiCacheNodeDetails,
} from '../lib/types.js'

describe('ElastiCache Cache Module', () => {
  beforeEach(() => {
    clearElastiCacheCache()
  })

  afterEach(() => {
    clearElastiCacheCache()
  })

  describe('ELASTICACHE_DATA_DIR', () => {
    it('should be a valid path', () => {
      expect(typeof ELASTICACHE_DATA_DIR).toBe('string')
      expect(ELASTICACHE_DATA_DIR.length).toBeGreaterThan(0)
    })

    it('should point to an existing directory', () => {
      expect(existsSync(ELASTICACHE_DATA_DIR)).toBe(true)
    })

    it('should contain data/elasticache in the path', () => {
      expect(ELASTICACHE_DATA_DIR).toContain('data')
      expect(ELASTICACHE_DATA_DIR).toContain('elasticache')
    })
  })

  describe('nodeCache', () => {
    it('should be an LRU cache instance', () => {
      expect(nodeCache).toBeDefined()
      expect(typeof nodeCache.get).toBe('function')
      expect(typeof nodeCache.set).toBe('function')
      expect(typeof nodeCache.clear).toBe('function')
    })

    it('should store and retrieve values', () => {
      const testData = {
        nodeType: 'cache.test.large',
      } as ElastiCacheNodeDetails
      nodeCache.set('cache.test.large', testData)

      expect(nodeCache.get('cache.test.large')).toBe(testData)
    })

    it('should return undefined for non-existent keys', () => {
      expect(nodeCache.get('cache.non.existent')).toBeUndefined()
    })

    it('should be cleared by clearElastiCacheCache', () => {
      nodeCache.set('cache.test.large', {} as ElastiCacheNodeDetails)
      expect(nodeCache.size).toBe(1)

      clearElastiCacheCache()
      expect(nodeCache.size).toBe(0)
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
      const testData = { family: 'TEST' } as ElastiCacheFamilyData
      familyCache.set('TEST', testData)

      expect(familyCache.get('TEST')).toBe(testData)
    })

    it('should return undefined for non-existent keys', () => {
      expect(familyCache.get('NONEXISTENT')).toBeUndefined()
    })

    it('should be cleared by clearElastiCacheCache', () => {
      familyCache.set('TEST', {} as ElastiCacheFamilyData)
      expect(familyCache.size).toBe(1)

      clearElastiCacheCache()
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
        nodeTypes: [],
        categories: [],
      } as ElastiCacheInfo
      infoCacheHolder.value = testInfo

      expect(infoCacheHolder.value).toBe(testInfo)
    })

    it('should be cleared by clearElastiCacheCache', () => {
      infoCacheHolder.value = {
        families: [],
        nodeTypes: [],
        categories: [],
      } as ElastiCacheInfo
      expect(infoCacheHolder.value).not.toBeNull()

      clearElastiCacheCache()
      expect(infoCacheHolder.value).toBeNull()
    })
  })

  describe('clearElastiCacheCache', () => {
    it('should clear all caches', () => {
      // Populate caches
      nodeCache.set('cache.test.large', {} as ElastiCacheNodeDetails)
      familyCache.set('TEST', {} as ElastiCacheFamilyData)
      infoCacheHolder.value = {
        families: [],
        nodeTypes: [],
        categories: [],
      } as ElastiCacheInfo

      expect(nodeCache.size).toBe(1)
      expect(familyCache.size).toBe(1)
      expect(infoCacheHolder.value).not.toBeNull()

      // Clear
      clearElastiCacheCache()

      expect(nodeCache.size).toBe(0)
      expect(familyCache.size).toBe(0)
      expect(infoCacheHolder.value).toBeNull()
    })

    it('should not throw when caches are already empty', () => {
      expect(() => clearElastiCacheCache()).not.toThrow()
    })
  })

  describe('getElastiCacheCacheStats', () => {
    it('should return correct stats for empty cache', () => {
      const stats = getElastiCacheCacheStats()

      expect(stats).toEqual({
        nodes: 0,
        families: 0,
        infoLoaded: false,
      })
    })

    it('should return correct node count', () => {
      nodeCache.set('cache.test1.large', {} as ElastiCacheNodeDetails)
      nodeCache.set('cache.test2.large', {} as ElastiCacheNodeDetails)

      const stats = getElastiCacheCacheStats()
      expect(stats.nodes).toBe(2)
    })

    it('should return correct family count', () => {
      familyCache.set('TEST1', {} as ElastiCacheFamilyData)
      familyCache.set('TEST2', {} as ElastiCacheFamilyData)
      familyCache.set('TEST3', {} as ElastiCacheFamilyData)

      const stats = getElastiCacheCacheStats()
      expect(stats.families).toBe(3)
    })

    it('should return infoLoaded as true when info is cached', () => {
      infoCacheHolder.value = {
        families: [],
        nodeTypes: [],
        categories: [],
      } as ElastiCacheInfo

      const stats = getElastiCacheCacheStats()
      expect(stats.infoLoaded).toBe(true)
    })

    it('should return infoLoaded as false when info is not cached', () => {
      const stats = getElastiCacheCacheStats()
      expect(stats.infoLoaded).toBe(false)
    })
  })
})
