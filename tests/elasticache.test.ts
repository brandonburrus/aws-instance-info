import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
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
} from '../lib/elasticache.js'
import type {
  ElastiCacheCategory,
  ElastiCacheFamily,
  ElastiCacheFamilyData,
  ElastiCacheInfo,
  ElastiCacheNodeDetails,
  ElastiCacheNodeType,
} from '../lib/types.js'

/* Helper to load JSON directly from data files */
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ELASTICACHE_DATA_DIR = join(__dirname, '..', 'data', 'elasticache')

function loadJsonDirect<T>(relativePath: string): T {
  const fullPath = join(ELASTICACHE_DATA_DIR, relativePath)
  const content = readFileSync(fullPath, 'utf-8')
  return JSON.parse(content) as T
}

describe('ElastiCache Module', () => {
  beforeEach(() => {
    clearElastiCacheCache()
  })

  afterEach(() => {
    clearElastiCacheCache()
  })

  describe('getElastiCacheInfo', () => {
    it('should return info matching the JSON file', () => {
      const expected = loadJsonDirect<ElastiCacheInfo>('info.json')
      const actual = getElastiCacheInfo()

      expect(actual).toEqual(expected)
    })

    it('should return arrays for families, nodeTypes, and categories', () => {
      const info = getElastiCacheInfo()

      expect(Array.isArray(info.families)).toBe(true)
      expect(Array.isArray(info.nodeTypes)).toBe(true)
      expect(Array.isArray(info.categories)).toBe(true)
      expect(info.families.length).toBeGreaterThan(0)
      expect(info.nodeTypes.length).toBeGreaterThan(0)
      expect(info.categories.length).toBeGreaterThan(0)
    })

    it('should cache the info and return the same object on subsequent calls', () => {
      const first = getElastiCacheInfo()
      const second = getElastiCacheInfo()

      expect(first).toBe(second)
    })
  })

  describe('getElastiCacheNodeInfo', () => {
    it('should return node details matching the JSON file for cache.m5.large', () => {
      const expected = loadJsonDirect<ElastiCacheNodeDetails>(
        'nodes/cache.m5.large.json',
      )
      const actual = getElastiCacheNodeInfo(
        'cache.m5.large' as ElastiCacheNodeType,
      )

      expect(actual).toEqual(expected)
    })

    it('should return correct details for different node types', () => {
      const info = getElastiCacheInfo()
      // Test a few different node types
      const testNodes = info.nodeTypes.slice(0, 5)

      for (const nodeType of testNodes) {
        const expected = loadJsonDirect<ElastiCacheNodeDetails>(
          `nodes/${nodeType}.json`,
        )
        const actual = getElastiCacheNodeInfo(nodeType)

        expect(actual).toEqual(expected)
        expect(actual.nodeType).toBe(nodeType)
      }
    })

    it('should cache node data', () => {
      getElastiCacheNodeInfo('cache.m5.large' as ElastiCacheNodeType)
      const stats = getElastiCacheCacheStats()

      expect(stats.nodes).toBe(1)
    })

    it('should return cached data on subsequent calls', () => {
      const first = getElastiCacheNodeInfo(
        'cache.m5.large' as ElastiCacheNodeType,
      )
      const second = getElastiCacheNodeInfo(
        'cache.m5.large' as ElastiCacheNodeType,
      )

      expect(first).toBe(second)
    })

    it('should include all expected properties', () => {
      const node = getElastiCacheNodeInfo(
        'cache.m5.large' as ElastiCacheNodeType,
      )

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
    it('should return family data matching the JSON file for M5', () => {
      const expected = loadJsonDirect<ElastiCacheFamilyData>('families/M5.json')
      const actual = getElastiCacheFamily('M5' as ElastiCacheFamily)

      expect(actual).toEqual(expected)
    })

    it('should return correct data for different families', () => {
      const info = getElastiCacheInfo()
      // Test a few different families
      const testFamilies = info.families.slice(0, 5)

      for (const family of testFamilies) {
        const expected = loadJsonDirect<ElastiCacheFamilyData>(
          `families/${family}.json`,
        )
        const actual = getElastiCacheFamily(family)

        expect(actual).toEqual(expected)
        expect(actual.family).toBe(family)
      }
    })

    it('should cache family data', () => {
      getElastiCacheFamily('M5' as ElastiCacheFamily)
      const stats = getElastiCacheCacheStats()

      expect(stats.families).toBe(1)
    })

    it('should return cached data on subsequent calls', () => {
      const first = getElastiCacheFamily('M5' as ElastiCacheFamily)
      const second = getElastiCacheFamily('M5' as ElastiCacheFamily)

      expect(first).toBe(second)
    })

    it('should include all expected properties', () => {
      const family = getElastiCacheFamily('M5' as ElastiCacheFamily)

      expect(family).toHaveProperty('family')
      expect(family).toHaveProperty('category')
      expect(family).toHaveProperty('nodeTypes')
      expect(Array.isArray(family.nodeTypes)).toBe(true)
    })
  })

  describe('getElastiCacheFamilyNodeTypes', () => {
    it('should return node types matching the family JSON file', () => {
      const expected = loadJsonDirect<ElastiCacheFamilyData>('families/M5.json')
      const actual = getElastiCacheFamilyNodeTypes('M5' as ElastiCacheFamily)

      expect(actual).toEqual(expected.nodeTypes)
    })

    it('should return an array of node types', () => {
      const types = getElastiCacheFamilyNodeTypes('M5' as ElastiCacheFamily)

      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)
      expect(types.every(t => t.toLowerCase().includes('.m5.'))).toBe(true)
    })
  })

  describe('getElastiCacheFamilyCategory', () => {
    it('should return category matching the family JSON file', () => {
      const expected = loadJsonDirect<ElastiCacheFamilyData>('families/M5.json')
      const actual = getElastiCacheFamilyCategory('M5' as ElastiCacheFamily)

      expect(actual).toBe(expected.category)
    })

    it('should return correct categories for different family types', () => {
      // Test general purpose
      expect(getElastiCacheFamilyCategory('M5' as ElastiCacheFamily)).toBe(
        'general_purpose',
      )

      // Test memory optimized
      expect(getElastiCacheFamilyCategory('R5' as ElastiCacheFamily)).toBe(
        'memory_optimized',
      )

      // Test burstable
      expect(getElastiCacheFamilyCategory('T3' as ElastiCacheFamily)).toBe(
        'burstable_performance',
      )
    })
  })

  describe('getAllElastiCacheFamilies', () => {
    it('should return all families from the info JSON', () => {
      const expected = loadJsonDirect<ElastiCacheInfo>('info.json')
      const actual = getAllElastiCacheFamilies()

      expect(actual).toEqual(expected.families)
    })

    it('should return a non-empty array', () => {
      const families = getAllElastiCacheFamilies()

      expect(Array.isArray(families)).toBe(true)
      expect(families.length).toBeGreaterThan(0)
    })
  })

  describe('getAllElastiCacheNodeTypes', () => {
    it('should return all node types from the info JSON', () => {
      const expected = loadJsonDirect<ElastiCacheInfo>('info.json')
      const actual = getAllElastiCacheNodeTypes()

      expect(actual).toEqual(expected.nodeTypes)
    })

    it('should return a non-empty array', () => {
      const types = getAllElastiCacheNodeTypes()

      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)
    })
  })

  describe('getAllElastiCacheCategories', () => {
    it('should return all categories from the info JSON', () => {
      const expected = loadJsonDirect<ElastiCacheInfo>('info.json')
      const actual = getAllElastiCacheCategories()

      expect(actual).toEqual(expected.categories)
    })

    it('should return expected category values', () => {
      const categories = getAllElastiCacheCategories()

      expect(categories).toContain('general_purpose')
      expect(categories).toContain('memory_optimized')
      expect(categories).toContain('burstable_performance')
    })
  })

  describe('isValidElastiCacheNodeType', () => {
    it('should return true for valid node types', () => {
      const info = loadJsonDirect<ElastiCacheInfo>('info.json')

      for (const nodeType of info.nodeTypes.slice(0, 10)) {
        expect(isValidElastiCacheNodeType(nodeType)).toBe(true)
      }
    })

    it('should return false for invalid node types', () => {
      expect(isValidElastiCacheNodeType('invalid.node')).toBe(false)
      expect(isValidElastiCacheNodeType('cache.m5.invalid')).toBe(false)
      expect(isValidElastiCacheNodeType('')).toBe(false)
      expect(isValidElastiCacheNodeType('random')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidElastiCacheNodeType('CACHE.M5.LARGE')).toBe(false) // Case sensitive
      expect(isValidElastiCacheNodeType('cache.m5.large')).toBe(true)
    })
  })

  describe('isValidElastiCacheFamily', () => {
    it('should return true for valid families', () => {
      const info = loadJsonDirect<ElastiCacheInfo>('info.json')

      for (const family of info.families) {
        expect(isValidElastiCacheFamily(family)).toBe(true)
      }
    })

    it('should return false for invalid families', () => {
      expect(isValidElastiCacheFamily('Invalid')).toBe(false)
      expect(isValidElastiCacheFamily('')).toBe(false)
      expect(isValidElastiCacheFamily('m5')).toBe(false) // Case sensitive
      expect(isValidElastiCacheFamily('random')).toBe(false)
    })

    it('should handle case sensitivity', () => {
      expect(isValidElastiCacheFamily('M5')).toBe(true)
      expect(isValidElastiCacheFamily('m5')).toBe(false)
    })
  })

  describe('getElastiCacheNodes', () => {
    it('should return a Map with correct node data', () => {
      const testNodes = [
        'cache.m5.large',
        'cache.m5.xlarge',
        'cache.r5.large',
      ] as ElastiCacheNodeType[]
      const result = getElastiCacheNodes(testNodes)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(3)

      for (const nodeType of testNodes) {
        const expected = loadJsonDirect<ElastiCacheNodeDetails>(
          `nodes/${nodeType}.json`,
        )
        expect(result.get(nodeType)).toEqual(expected)
      }
    })

    it('should return an empty Map for an empty array', () => {
      const result = getElastiCacheNodes([])

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })

    it('should cache all fetched nodes', () => {
      const testNodes = [
        'cache.m5.large',
        'cache.m5.xlarge',
      ] as ElastiCacheNodeType[]
      getElastiCacheNodes(testNodes)
      const stats = getElastiCacheCacheStats()

      expect(stats.nodes).toBe(2)
    })
  })

  describe('getElastiCacheFamilies', () => {
    it('should return a Map with correct family data', () => {
      const testFamilies = ['M5', 'R5', 'T3'] as ElastiCacheFamily[]
      const result = getElastiCacheFamilies(testFamilies)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(3)

      for (const family of testFamilies) {
        const expected = loadJsonDirect<ElastiCacheFamilyData>(
          `families/${family}.json`,
        )
        expect(result.get(family)).toEqual(expected)
      }
    })

    it('should return an empty Map for an empty array', () => {
      const result = getElastiCacheFamilies([])

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })

    it('should cache all fetched families', () => {
      const testFamilies = ['M5', 'R5'] as ElastiCacheFamily[]
      getElastiCacheFamilies(testFamilies)
      const stats = getElastiCacheCacheStats()

      expect(stats.families).toBe(2)
    })
  })

  describe('clearElastiCacheCache', () => {
    it('should clear all cached data', () => {
      // Populate cache
      getElastiCacheInfo()
      getElastiCacheNodeInfo('cache.m5.large' as ElastiCacheNodeType)
      getElastiCacheFamily('M5' as ElastiCacheFamily)

      let stats = getElastiCacheCacheStats()
      expect(stats.nodes).toBe(1)
      expect(stats.families).toBe(1)
      expect(stats.infoLoaded).toBe(true)

      // Clear cache
      clearElastiCacheCache()

      stats = getElastiCacheCacheStats()
      expect(stats.nodes).toBe(0)
      expect(stats.families).toBe(0)
      expect(stats.infoLoaded).toBe(false)
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

    it('should return correct stats after loading data', () => {
      getElastiCacheInfo()
      getElastiCacheNodeInfo('cache.m5.large' as ElastiCacheNodeType)
      getElastiCacheNodeInfo('cache.m5.xlarge' as ElastiCacheNodeType)
      getElastiCacheFamily('M5' as ElastiCacheFamily)

      const stats = getElastiCacheCacheStats()

      expect(stats).toEqual({
        nodes: 2,
        families: 1,
        infoLoaded: true,
      })
    })
  })

  describe('Data Integrity', () => {
    it('should have consistent data between node and family files', () => {
      const info = getElastiCacheInfo()

      // Check all families
      for (const familyName of info.families) {
        const family = getElastiCacheFamily(familyName)

        // Each node in the family should exist and have the correct family
        for (const nodeType of family.nodeTypes) {
          expect(info.nodeTypes).toContain(nodeType)

          const node = getElastiCacheNodeInfo(nodeType)
          expect(node.family).toBe(familyName)
          expect(node.category).toBe(family.category)
        }
      }
    })

    it('should have valid categories for all families', () => {
      const info = getElastiCacheInfo()
      const validCategories = new Set(info.categories)

      for (const familyName of info.families) {
        const category = getElastiCacheFamilyCategory(familyName)
        expect(validCategories.has(category)).toBe(true)
      }
    })
  })
})
