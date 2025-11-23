import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  getAllElastiCacheCategories,
  getAllElastiCacheFamilies,
  getAllElastiCacheNodeTypes,
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
import {
  clearElastiCacheCache,
  getElastiCacheCacheStats,
} from '../lib/elasticache.cache.js'
import type {
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

describe('ElastiCache Async Module', () => {
  beforeEach(() => {
    clearElastiCacheCache()
  })

  afterEach(() => {
    clearElastiCacheCache()
  })

  describe('getElastiCacheInfo', () => {
    it('should return info matching the JSON file', async () => {
      const expected = loadJsonDirect<ElastiCacheInfo>('info.json')
      const actual = await getElastiCacheInfo()

      expect(actual).toEqual(expected)
    })

    it('should return arrays for families, nodeTypes, and categories', async () => {
      const info = await getElastiCacheInfo()

      expect(Array.isArray(info.families)).toBe(true)
      expect(Array.isArray(info.nodeTypes)).toBe(true)
      expect(Array.isArray(info.categories)).toBe(true)
    })

    it('should cache the info and return the same object on subsequent calls', async () => {
      const first = await getElastiCacheInfo()
      const second = await getElastiCacheInfo()

      expect(first).toBe(second)
    })
  })

  describe('getElastiCacheNodeInfo', () => {
    it('should return node details matching the JSON file', async () => {
      const expected = loadJsonDirect<ElastiCacheNodeDetails>(
        'nodes/cache.m5.large.json',
      )
      const actual = await getElastiCacheNodeInfo(
        'cache.m5.large' as ElastiCacheNodeType,
      )

      expect(actual).toEqual(expected)
    })

    it('should cache node data', async () => {
      await getElastiCacheNodeInfo('cache.m5.large' as ElastiCacheNodeType)
      const stats = getElastiCacheCacheStats()

      expect(stats.nodes).toBe(1)
    })

    it('should return cached data on subsequent calls', async () => {
      const first = await getElastiCacheNodeInfo(
        'cache.m5.large' as ElastiCacheNodeType,
      )
      const second = await getElastiCacheNodeInfo(
        'cache.m5.large' as ElastiCacheNodeType,
      )

      expect(first).toBe(second)
    })
  })

  describe('getElastiCacheFamily', () => {
    it('should return family data matching the JSON file', async () => {
      const expected = loadJsonDirect<ElastiCacheFamilyData>('families/M5.json')
      const actual = await getElastiCacheFamily('M5' as ElastiCacheFamily)

      expect(actual).toEqual(expected)
    })

    it('should cache family data', async () => {
      await getElastiCacheFamily('M5' as ElastiCacheFamily)
      const stats = getElastiCacheCacheStats()

      expect(stats.families).toBe(1)
    })

    it('should return cached data on subsequent calls', async () => {
      const first = await getElastiCacheFamily('M5' as ElastiCacheFamily)
      const second = await getElastiCacheFamily('M5' as ElastiCacheFamily)

      expect(first).toBe(second)
    })
  })

  describe('getElastiCacheFamilyNodeTypes', () => {
    it('should return node types matching the family JSON file', async () => {
      const expected = loadJsonDirect<ElastiCacheFamilyData>('families/M5.json')
      const actual = await getElastiCacheFamilyNodeTypes(
        'M5' as ElastiCacheFamily,
      )

      expect(actual).toEqual(expected.nodeTypes)
    })
  })

  describe('getElastiCacheFamilyCategory', () => {
    it('should return category matching the family JSON file', async () => {
      const expected = loadJsonDirect<ElastiCacheFamilyData>('families/M5.json')
      const actual = await getElastiCacheFamilyCategory(
        'M5' as ElastiCacheFamily,
      )

      expect(actual).toBe(expected.category)
    })
  })

  describe('getAllElastiCacheFamilies', () => {
    it('should return all families from the info JSON', async () => {
      const expected = loadJsonDirect<ElastiCacheInfo>('info.json')
      const actual = await getAllElastiCacheFamilies()

      expect(actual).toEqual(expected.families)
    })
  })

  describe('getAllElastiCacheNodeTypes', () => {
    it('should return all node types from the info JSON', async () => {
      const expected = loadJsonDirect<ElastiCacheInfo>('info.json')
      const actual = await getAllElastiCacheNodeTypes()

      expect(actual).toEqual(expected.nodeTypes)
    })
  })

  describe('getAllElastiCacheCategories', () => {
    it('should return all categories from the info JSON', async () => {
      const expected = loadJsonDirect<ElastiCacheInfo>('info.json')
      const actual = await getAllElastiCacheCategories()

      expect(actual).toEqual(expected.categories)
    })
  })

  describe('isValidElastiCacheNodeType', () => {
    it('should return true for valid node types', async () => {
      expect(await isValidElastiCacheNodeType('cache.m5.large')).toBe(true)
    })

    it('should return false for invalid node types', async () => {
      expect(await isValidElastiCacheNodeType('invalid.node')).toBe(false)
    })
  })

  describe('isValidElastiCacheFamily', () => {
    it('should return true for valid families', async () => {
      expect(await isValidElastiCacheFamily('M5')).toBe(true)
    })

    it('should return false for invalid families', async () => {
      expect(await isValidElastiCacheFamily('Invalid')).toBe(false)
    })
  })

  describe('getElastiCacheNodes', () => {
    it('should return a Map with correct node data', async () => {
      const testNodes = [
        'cache.m5.large',
        'cache.m5.xlarge',
      ] as ElastiCacheNodeType[]
      const result = await getElastiCacheNodes(testNodes)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(2)

      for (const nodeType of testNodes) {
        const expected = loadJsonDirect<ElastiCacheNodeDetails>(
          `nodes/${nodeType}.json`,
        )
        expect(result.get(nodeType)).toEqual(expected)
      }
    })

    it('should return an empty Map for an empty array', async () => {
      const result = await getElastiCacheNodes([])

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('getElastiCacheFamilies', () => {
    it('should return a Map with correct family data', async () => {
      const testFamilies = ['M5', 'R5'] as ElastiCacheFamily[]
      const result = await getElastiCacheFamilies(testFamilies)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(2)

      for (const family of testFamilies) {
        const expected = loadJsonDirect<ElastiCacheFamilyData>(
          `families/${family}.json`,
        )
        expect(result.get(family)).toEqual(expected)
      }
    })

    it('should return an empty Map for an empty array', async () => {
      const result = await getElastiCacheFamilies([])

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('Re-exported cache utilities', () => {
    it('should re-export clearElastiCacheCache', async () => {
      const { clearElastiCacheCache: reExported } = await import(
        '../lib/elasticache.async.js'
      )
      expect(typeof reExported).toBe('function')
    })

    it('should re-export getElastiCacheCacheStats', async () => {
      const { getElastiCacheCacheStats: reExported } = await import(
        '../lib/elasticache.async.js'
      )
      expect(typeof reExported).toBe('function')
    })
  })
})
