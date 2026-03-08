import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  clearElastiCacheCache,
  getAllElastiCacheCategories,
  getAllElastiCacheFamilies,
  getAllElastiCacheNodeTypes,
  getElastiCacheCacheStats,
  getElastiCacheFamilies,
  getElastiCacheFamily,
  getElastiCacheFamilyCategory,
  getElastiCacheFamilyNodeTypes,
  getElastiCacheInfo,
  getElastiCacheNodeInfo,
  getElastiCacheNodes,
  isValidElastiCacheFamily,
  isValidElastiCacheNodeType,
} from '../lib/elasticache.async.js'

// MSW is set up in tests/setup.ts via vitest setupFiles
// Fixtures contain: cache.m5.large, cache.m5.xlarge, cache.m5.2xlarge (M5 family),
// cache.r5.large, cache.r5.xlarge (R5 family), cache.t3.micro, cache.t3.small (T3 family)

describe('ElastiCache Async Module', () => {
  beforeEach(() => {
    clearElastiCacheCache()
  })

  afterEach(() => {
    clearElastiCacheCache()
  })

  describe('getElastiCacheInfo', () => {
    it('should return arrays for families, nodeTypes, and categories', async () => {
      const info = await getElastiCacheInfo()

      expect(Array.isArray(info.families)).toBe(true)
      expect(Array.isArray(info.nodeTypes)).toBe(true)
      expect(Array.isArray(info.categories)).toBe(true)
      expect(info.families.length).toBeGreaterThan(0)
      expect(info.nodeTypes.length).toBeGreaterThan(0)
      expect(info.categories.length).toBeGreaterThan(0)
    })

    it('should include expected families from fixtures', async () => {
      const info = await getElastiCacheInfo()
      expect(info.families).toContain('M5')
      expect(info.families).toContain('R5')
      expect(info.families).toContain('T3')
    })

    it('should include expected node types from fixtures', async () => {
      const info = await getElastiCacheInfo()
      expect(info.nodeTypes).toContain('cache.m5.large')
      expect(info.nodeTypes).toContain('cache.r5.large')
      expect(info.nodeTypes).toContain('cache.t3.micro')
    })

    it('should include expected categories', async () => {
      const info = await getElastiCacheInfo()
      expect(info.categories).toContain('general_purpose')
      expect(info.categories).toContain('memory_optimized')
      expect(info.categories).toContain('burstable_performance')
    })

    it('should cache the info and return the same object on subsequent calls', async () => {
      const first = await getElastiCacheInfo()
      const second = await getElastiCacheInfo()
      expect(first).toBe(second)
    })
  })

  describe('getElastiCacheNodeInfo', () => {
    it('should return node details for cache.m5.large', async () => {
      const node = await getElastiCacheNodeInfo('cache.m5.large')
      expect(node.nodeType).toBe('cache.m5.large')
      expect(node.family).toBe('M5')
      expect(node.category).toBe('general_purpose')
      expect(node.vCPUs).toBe(2)
      expect(node.memoryGiB).toBe(6.38)
    })

    it('should return node details for cache.r5.large', async () => {
      const node = await getElastiCacheNodeInfo('cache.r5.large')
      expect(node.nodeType).toBe('cache.r5.large')
      expect(node.family).toBe('R5')
      expect(node.category).toBe('memory_optimized')
    })

    it('should return node details for cache.t3.micro', async () => {
      const node = await getElastiCacheNodeInfo('cache.t3.micro')
      expect(node.nodeType).toBe('cache.t3.micro')
      expect(node.family).toBe('T3')
      expect(node.category).toBe('burstable_performance')
    })

    it('should throw for unknown node types', async () => {
      await expect(
        getElastiCacheNodeInfo('cache.invalid.large'),
      ).rejects.toThrow('Unknown ElastiCache node type')
    })

    it('should cache node data', async () => {
      await getElastiCacheNodeInfo('cache.m5.large')
      const stats = getElastiCacheCacheStats()
      expect(stats.nodeCacheSize).toBeGreaterThanOrEqual(1)
    })

    it('should return cached data on subsequent calls', async () => {
      const first = await getElastiCacheNodeInfo('cache.m5.large')
      const second = await getElastiCacheNodeInfo('cache.m5.large')
      expect(first).toBe(second)
    })

    it('should include all expected properties', async () => {
      const node = await getElastiCacheNodeInfo('cache.m5.large')
      expect(node).toHaveProperty('nodeType')
      expect(node).toHaveProperty('family')
      expect(node).toHaveProperty('category')
      expect(node).toHaveProperty('vCPUs')
      expect(node).toHaveProperty('memoryGiB')
      expect(node).toHaveProperty('networkPerformance')
      expect(node).toHaveProperty('baselineBandwidthGbps')
      expect(node).toHaveProperty('burstBandwidthGbps')
    })
  })

  describe('getElastiCacheFamily', () => {
    it('should return family data for M5', async () => {
      const family = await getElastiCacheFamily('M5')
      expect(family.family).toBe('M5')
      expect(family.category).toBe('general_purpose')
      expect(Array.isArray(family.nodeTypes)).toBe(true)
      expect(family.nodeTypes).toContain('cache.m5.large')
      expect(family.nodeTypes).toContain('cache.m5.xlarge')
    })

    it('should throw for unknown families', async () => {
      await expect(getElastiCacheFamily('InvalidFamily')).rejects.toThrow(
        'Unknown ElastiCache family',
      )
    })

    it('should cache family data', async () => {
      await getElastiCacheFamily('M5')
      const stats = getElastiCacheCacheStats()
      expect(stats.familyCacheSize).toBeGreaterThanOrEqual(1)
    })

    it('should return cached data on subsequent calls', async () => {
      const first = await getElastiCacheFamily('M5')
      const second = await getElastiCacheFamily('M5')
      expect(first).toBe(second)
    })

    it('should include all expected properties', async () => {
      const family = await getElastiCacheFamily('M5')
      expect(family).toHaveProperty('family')
      expect(family).toHaveProperty('category')
      expect(family).toHaveProperty('nodeTypes')
      expect(Array.isArray(family.nodeTypes)).toBe(true)
    })
  })

  describe('getElastiCacheFamilyNodeTypes', () => {
    it('should return node types for M5 family', async () => {
      const types = await getElastiCacheFamilyNodeTypes('M5')
      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)
      expect(types).toContain('cache.m5.large')
    })
  })

  describe('getElastiCacheFamilyCategory', () => {
    it('should return general_purpose for M5', async () => {
      const category = await getElastiCacheFamilyCategory('M5')
      expect(category).toBe('general_purpose')
    })

    it('should return memory_optimized for R5', async () => {
      const category = await getElastiCacheFamilyCategory('R5')
      expect(category).toBe('memory_optimized')
    })

    it('should return burstable_performance for T3', async () => {
      const category = await getElastiCacheFamilyCategory('T3')
      expect(category).toBe('burstable_performance')
    })
  })

  describe('getAllElastiCacheFamilies', () => {
    it('should return all families', async () => {
      const families = await getAllElastiCacheFamilies()
      expect(Array.isArray(families)).toBe(true)
      expect(families.length).toBeGreaterThan(0)
      expect(families).toContain('M5')
    })
  })

  describe('getAllElastiCacheNodeTypes', () => {
    it('should return all node types', async () => {
      const types = await getAllElastiCacheNodeTypes()
      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)
      expect(types).toContain('cache.m5.large')
    })
  })

  describe('getAllElastiCacheCategories', () => {
    it('should return all categories', async () => {
      const categories = await getAllElastiCacheCategories()
      expect(categories).toContain('general_purpose')
      expect(categories).toContain('memory_optimized')
      expect(categories).toContain('network_optimized')
      expect(categories).toContain('burstable_performance')
    })
  })

  describe('isValidElastiCacheNodeType', () => {
    it('should return true for valid node types', async () => {
      expect(await isValidElastiCacheNodeType('cache.m5.large')).toBe(true)
      expect(await isValidElastiCacheNodeType('cache.r5.large')).toBe(true)
    })

    it('should return false for invalid node types', async () => {
      expect(await isValidElastiCacheNodeType('invalid.node')).toBe(false)
      expect(await isValidElastiCacheNodeType('cache.m5.invalid')).toBe(false)
      expect(await isValidElastiCacheNodeType('')).toBe(false)
    })
  })

  describe('isValidElastiCacheFamily', () => {
    it('should return true for valid families', async () => {
      expect(await isValidElastiCacheFamily('M5')).toBe(true)
      expect(await isValidElastiCacheFamily('R5')).toBe(true)
    })

    it('should return false for invalid families', async () => {
      expect(await isValidElastiCacheFamily('Invalid')).toBe(false)
      expect(await isValidElastiCacheFamily('m5')).toBe(false)
      expect(await isValidElastiCacheFamily('')).toBe(false)
    })
  })

  describe('getElastiCacheNodes', () => {
    it('should return a Map with correct node data', async () => {
      const result = await getElastiCacheNodes([
        'cache.m5.large',
        'cache.m5.xlarge',
      ])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(2)
      expect(result.get('cache.m5.large')?.nodeType).toBe('cache.m5.large')
      expect(result.get('cache.m5.xlarge')?.nodeType).toBe('cache.m5.xlarge')
    })

    it('should return an empty Map for an empty array', async () => {
      const result = await getElastiCacheNodes([])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('getElastiCacheFamilies', () => {
    it('should return a Map with correct family data', async () => {
      const result = await getElastiCacheFamilies(['M5', 'R5'])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(2)
      expect(result.get('M5')?.family).toBe('M5')
      expect(result.get('R5')?.family).toBe('R5')
    })

    it('should return an empty Map for an empty array', async () => {
      const result = await getElastiCacheFamilies([])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('clearElastiCacheCache and getElastiCacheCacheStats', () => {
    it('should export clearElastiCacheCache as a function', async () => {
      const { clearElastiCacheCache: fn } = await import(
        '../lib/elasticache.async.js'
      )
      expect(typeof fn).toBe('function')
    })

    it('should export getElastiCacheCacheStats as a function', async () => {
      const { getElastiCacheCacheStats: fn } = await import(
        '../lib/elasticache.async.js'
      )
      expect(typeof fn).toBe('function')
    })

    it('stats should have nodeCacheSize and familyCacheSize', async () => {
      await getElastiCacheNodeInfo('cache.m5.large')
      await getElastiCacheFamily('M5')
      const stats = getElastiCacheCacheStats()
      expect(typeof stats.nodeCacheSize).toBe('number')
      expect(typeof stats.familyCacheSize).toBe('number')
      expect(stats.nodeCacheSize).toBeGreaterThanOrEqual(1)
      expect(stats.familyCacheSize).toBeGreaterThanOrEqual(1)
    })

    it('clearElastiCacheCache resets cache sizes to 0', async () => {
      await getElastiCacheNodeInfo('cache.m5.large')
      clearElastiCacheCache()
      const stats = getElastiCacheCacheStats()
      expect(stats.nodeCacheSize).toBe(0)
      expect(stats.familyCacheSize).toBe(0)
    })
  })
})
