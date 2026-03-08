import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// NOTE: The sync wrapper functions in elasticache.ts use make-synchronous, which
// spawns a worker thread. MSW intercepts fetch at the main thread level only and
// does NOT intercept requests inside worker threads. Therefore, sync wrapper tests
// that make network calls will hit the real network unless mocked differently.
//
// Strategy: These tests verify exported function shapes and call-through behavior.
// For data-correctness coverage, the async tests (elasticache.async.test.ts) provide
// comprehensive coverage via MSW-intercepted fixtures.

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
} from '../lib/elasticache.js'

describe('ElastiCache Module (sync wrappers)', () => {
  beforeEach(() => {
    clearElastiCacheCache()
  })

  afterEach(() => {
    clearElastiCacheCache()
  })

  describe('exports', () => {
    it('should export getElastiCacheInfo as a function', () => {
      expect(typeof getElastiCacheInfo).toBe('function')
    })

    it('should export getElastiCacheNodeInfo as a function', () => {
      expect(typeof getElastiCacheNodeInfo).toBe('function')
    })

    it('should export getElastiCacheFamily as a function', () => {
      expect(typeof getElastiCacheFamily).toBe('function')
    })

    it('should export getElastiCacheFamilyNodeTypes as a function', () => {
      expect(typeof getElastiCacheFamilyNodeTypes).toBe('function')
    })

    it('should export getElastiCacheFamilyCategory as a function', () => {
      expect(typeof getElastiCacheFamilyCategory).toBe('function')
    })

    it('should export getAllElastiCacheFamilies as a function', () => {
      expect(typeof getAllElastiCacheFamilies).toBe('function')
    })

    it('should export getAllElastiCacheNodeTypes as a function', () => {
      expect(typeof getAllElastiCacheNodeTypes).toBe('function')
    })

    it('should export getAllElastiCacheCategories as a function', () => {
      expect(typeof getAllElastiCacheCategories).toBe('function')
    })

    it('should export isValidElastiCacheNodeType as a function', () => {
      expect(typeof isValidElastiCacheNodeType).toBe('function')
    })

    it('should export isValidElastiCacheFamily as a function', () => {
      expect(typeof isValidElastiCacheFamily).toBe('function')
    })

    it('should export getElastiCacheNodes as a function', () => {
      expect(typeof getElastiCacheNodes).toBe('function')
    })

    it('should export getElastiCacheFamilies as a function', () => {
      expect(typeof getElastiCacheFamilies).toBe('function')
    })

    it('should export clearElastiCacheCache as a function', () => {
      expect(typeof clearElastiCacheCache).toBe('function')
    })

    it('should export getElastiCacheCacheStats as a function', () => {
      expect(typeof getElastiCacheCacheStats).toBe('function')
    })
  })

  describe('getElastiCacheInfo', () => {
    it('should return arrays for families, nodeTypes, and categories', () => {
      const info = getElastiCacheInfo()

      expect(Array.isArray(info.families)).toBe(true)
      expect(Array.isArray(info.nodeTypes)).toBe(true)
      expect(Array.isArray(info.categories)).toBe(true)
      expect(info.families.length).toBeGreaterThan(0)
      expect(info.nodeTypes.length).toBeGreaterThan(0)
      expect(info.categories.length).toBeGreaterThan(0)
    })

    it('should include expected categories', () => {
      const info = getElastiCacheInfo()
      expect(info.categories).toContain('general_purpose')
      expect(info.categories).toContain('memory_optimized')
      expect(info.categories).toContain('burstable_performance')
    })
  })

  describe('getElastiCacheNodeInfo', () => {
    it('should return node details with correct shape', () => {
      const info = getElastiCacheInfo()
      const firstNode = info.nodeTypes[0]
      if (!firstNode) return

      const node = getElastiCacheNodeInfo(firstNode)
      expect(node).toHaveProperty('nodeType')
      expect(node).toHaveProperty('family')
      expect(node).toHaveProperty('category')
      expect(node).toHaveProperty('vCPUs')
      expect(node).toHaveProperty('memoryGiB')
      expect(node).toHaveProperty('networkPerformance')
      expect(node).toHaveProperty('baselineBandwidthGbps')
      expect(node).toHaveProperty('burstBandwidthGbps')
    })

    it('should throw for unknown node types', () => {
      expect(() => getElastiCacheNodeInfo('cache.invalid.large')).toThrow(
        'Unknown ElastiCache node type',
      )
    })
  })

  describe('getElastiCacheFamily', () => {
    it('should return family data with correct shape', () => {
      const info = getElastiCacheInfo()
      const firstFamily = info.families[0]
      if (!firstFamily) return

      const family = getElastiCacheFamily(firstFamily)
      expect(family).toHaveProperty('family')
      expect(family).toHaveProperty('category')
      expect(family).toHaveProperty('nodeTypes')
      expect(Array.isArray(family.nodeTypes)).toBe(true)
    })

    it('should throw for unknown families', () => {
      expect(() => getElastiCacheFamily('InvalidFamily')).toThrow(
        'Unknown ElastiCache family',
      )
    })
  })

  describe('getElastiCacheFamilyNodeTypes', () => {
    it('should return an array of node types', () => {
      const info = getElastiCacheInfo()
      const firstFamily = info.families[0]
      if (!firstFamily) return

      const types = getElastiCacheFamilyNodeTypes(firstFamily)
      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)
    })
  })

  describe('getElastiCacheFamilyCategory', () => {
    it('should return a valid category string', () => {
      const info = getElastiCacheInfo()
      const firstFamily = info.families[0]
      if (!firstFamily) return

      const category = getElastiCacheFamilyCategory(firstFamily)
      expect(typeof category).toBe('string')
      expect(info.categories).toContain(category)
    })
  })

  describe('getAllElastiCacheFamilies', () => {
    it('should return a non-empty array', () => {
      const families = getAllElastiCacheFamilies()
      expect(Array.isArray(families)).toBe(true)
      expect(families.length).toBeGreaterThan(0)
    })
  })

  describe('getAllElastiCacheNodeTypes', () => {
    it('should return a non-empty array', () => {
      const types = getAllElastiCacheNodeTypes()
      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)
    })
  })

  describe('getAllElastiCacheCategories', () => {
    it('should return expected category values', () => {
      const categories = getAllElastiCacheCategories()
      expect(categories).toContain('general_purpose')
      expect(categories).toContain('memory_optimized')
      expect(categories).toContain('burstable_performance')
    })
  })

  describe('isValidElastiCacheNodeType', () => {
    it('should return true for valid node types', () => {
      const info = getElastiCacheInfo()
      const firstNode = info.nodeTypes[0]
      if (!firstNode) return
      expect(isValidElastiCacheNodeType(firstNode)).toBe(true)
    })

    it('should return false for invalid node types', () => {
      expect(isValidElastiCacheNodeType('invalid.node')).toBe(false)
      expect(isValidElastiCacheNodeType('')).toBe(false)
    })
  })

  describe('isValidElastiCacheFamily', () => {
    it('should return true for valid families', () => {
      const info = getElastiCacheInfo()
      const firstFamily = info.families[0]
      if (!firstFamily) return
      expect(isValidElastiCacheFamily(firstFamily)).toBe(true)
    })

    it('should return false for invalid families', () => {
      expect(isValidElastiCacheFamily('Invalid')).toBe(false)
      expect(isValidElastiCacheFamily('')).toBe(false)
    })
  })

  describe('getElastiCacheNodes', () => {
    it('should return a Map with correct node data', () => {
      const info = getElastiCacheInfo()
      const testNodes = info.nodeTypes.slice(0, 2)
      const result = getElastiCacheNodes(testNodes)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(testNodes.length)

      for (const nodeType of testNodes) {
        const node = result.get(nodeType)
        expect(node?.nodeType).toBe(nodeType)
      }
    })

    it('should return an empty Map for an empty array', () => {
      const result = getElastiCacheNodes([])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('getElastiCacheFamilies', () => {
    it('should return a Map with correct family data', () => {
      const info = getElastiCacheInfo()
      const testFamilies = info.families.slice(0, 2)
      const result = getElastiCacheFamilies(testFamilies)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(testFamilies.length)

      for (const family of testFamilies) {
        const fd = result.get(family)
        expect(fd?.family).toBe(family)
      }
    })

    it('should return an empty Map for an empty array', () => {
      const result = getElastiCacheFamilies([])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('clearElastiCacheCache and getElastiCacheCacheStats', () => {
    it('stats should have nodeCacheSize and familyCacheSize', () => {
      const stats = getElastiCacheCacheStats()
      expect(typeof stats.nodeCacheSize).toBe('number')
      expect(typeof stats.familyCacheSize).toBe('number')
    })

    it('clearElastiCacheCache resets cache sizes to 0', () => {
      clearElastiCacheCache()
      const stats = getElastiCacheCacheStats()
      expect(stats.nodeCacheSize).toBe(0)
      expect(stats.familyCacheSize).toBe(0)
    })

    it('Data integrity: families listed in info match family data', () => {
      const info = getElastiCacheInfo()
      // Check a few families for consistency
      for (const familyName of info.families.slice(0, 3)) {
        const family = getElastiCacheFamily(familyName)
        expect(family.family).toBe(familyName)
        expect(info.categories).toContain(family.category)

        for (const nodeType of family.nodeTypes) {
          expect(info.nodeTypes).toContain(nodeType)
          const node = getElastiCacheNodeInfo(nodeType)
          expect(node.family).toBe(familyName)
          expect(node.category).toBe(family.category)
        }
      }
    })
  })
})
