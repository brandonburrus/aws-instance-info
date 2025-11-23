import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  getAllRDSCategories,
  getAllRDSFamilies,
  getAllRDSInstanceClasses,
  getRDSFamilies,
  getRDSFamily,
  getRDSFamilyCategory,
  getRDSFamilyInstanceClasses,
  getRDSInfo,
  getRDSInstanceInfo,
  getRDSInstances,
  isValidRDSFamily,
  isValidRDSInstanceClass,
} from '../lib/rds.async.js'
import { clearRDSCache, getRDSCacheStats } from '../lib/rds.cache.js'
import type {
  RDSFamilyData,
  RDSInfo,
  RDSInstanceClass,
  RDSInstanceDetails,
  RDSInstanceFamily,
} from '../lib/types.js'

/* Helper to load JSON directly from data files */
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const RDS_DATA_DIR = join(__dirname, '..', 'data', 'rds')

function loadJsonDirect<T>(relativePath: string): T {
  const fullPath = join(RDS_DATA_DIR, relativePath)
  const content = readFileSync(fullPath, 'utf-8')
  return JSON.parse(content) as T
}

describe('RDS Async Module', () => {
  beforeEach(() => {
    clearRDSCache()
  })

  afterEach(() => {
    clearRDSCache()
  })

  describe('getRDSInfo', () => {
    it('should return info matching the JSON file', async () => {
      const expected = loadJsonDirect<RDSInfo>('info.json')
      const actual = await getRDSInfo()

      expect(actual).toEqual(expected)
    })

    it('should return arrays for families, instances, and categories', async () => {
      const info = await getRDSInfo()

      expect(Array.isArray(info.families)).toBe(true)
      expect(Array.isArray(info.instances)).toBe(true)
      expect(Array.isArray(info.categories)).toBe(true)
    })

    it('should cache the info and return the same object on subsequent calls', async () => {
      const first = await getRDSInfo()
      const second = await getRDSInfo()

      expect(first).toBe(second)
    })
  })

  describe('getRDSInstanceInfo', () => {
    it('should return instance details matching the JSON file', async () => {
      const expected = loadJsonDirect<RDSInstanceDetails>(
        'instances/db.m5.large.json',
      )
      const actual = await getRDSInstanceInfo('db.m5.large' as RDSInstanceClass)

      expect(actual).toEqual(expected)
    })

    it('should cache instance data', async () => {
      await getRDSInstanceInfo('db.m5.large' as RDSInstanceClass)
      const stats = getRDSCacheStats()

      expect(stats.instances).toBe(1)
    })

    it('should return cached data on subsequent calls', async () => {
      const first = await getRDSInstanceInfo('db.m5.large' as RDSInstanceClass)
      const second = await getRDSInstanceInfo('db.m5.large' as RDSInstanceClass)

      expect(first).toBe(second)
    })
  })

  describe('getRDSFamily', () => {
    it('should return family data matching the JSON file', async () => {
      const expected = loadJsonDirect<RDSFamilyData>('families/M5.json')
      const actual = await getRDSFamily('M5' as RDSInstanceFamily)

      expect(actual).toEqual(expected)
    })

    it('should cache family data', async () => {
      await getRDSFamily('M5' as RDSInstanceFamily)
      const stats = getRDSCacheStats()

      expect(stats.families).toBe(1)
    })

    it('should return cached data on subsequent calls', async () => {
      const first = await getRDSFamily('M5' as RDSInstanceFamily)
      const second = await getRDSFamily('M5' as RDSInstanceFamily)

      expect(first).toBe(second)
    })
  })

  describe('getRDSFamilyInstanceClasses', () => {
    it('should return instance classes matching the family JSON file', async () => {
      const expected = loadJsonDirect<RDSFamilyData>('families/M5.json')
      const actual = await getRDSFamilyInstanceClasses(
        'M5' as RDSInstanceFamily,
      )

      expect(actual).toEqual(expected.instanceClasses)
    })
  })

  describe('getRDSFamilyCategory', () => {
    it('should return category matching the family JSON file', async () => {
      const expected = loadJsonDirect<RDSFamilyData>('families/M5.json')
      const actual = await getRDSFamilyCategory('M5' as RDSInstanceFamily)

      expect(actual).toBe(expected.category)
    })
  })

  describe('getAllRDSFamilies', () => {
    it('should return all families from the info JSON', async () => {
      const expected = loadJsonDirect<RDSInfo>('info.json')
      const actual = await getAllRDSFamilies()

      expect(actual).toEqual(expected.families)
    })
  })

  describe('getAllRDSInstanceClasses', () => {
    it('should return all instance classes from the info JSON', async () => {
      const expected = loadJsonDirect<RDSInfo>('info.json')
      const actual = await getAllRDSInstanceClasses()

      expect(actual).toEqual(expected.instances)
    })
  })

  describe('getAllRDSCategories', () => {
    it('should return all categories from the info JSON', async () => {
      const expected = loadJsonDirect<RDSInfo>('info.json')
      const actual = await getAllRDSCategories()

      expect(actual).toEqual(expected.categories)
    })
  })

  describe('isValidRDSInstanceClass', () => {
    it('should return true for valid instance classes', async () => {
      expect(await isValidRDSInstanceClass('db.m5.large')).toBe(true)
    })

    it('should return false for invalid instance classes', async () => {
      expect(await isValidRDSInstanceClass('invalid.instance')).toBe(false)
    })
  })

  describe('isValidRDSFamily', () => {
    it('should return true for valid families', async () => {
      expect(await isValidRDSFamily('M5')).toBe(true)
    })

    it('should return false for invalid families', async () => {
      expect(await isValidRDSFamily('Invalid')).toBe(false)
    })
  })

  describe('getRDSInstances', () => {
    it('should return a Map with correct instance data', async () => {
      const testClasses = ['db.m5.large', 'db.m5.xlarge'] as RDSInstanceClass[]
      const result = await getRDSInstances(testClasses)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(2)

      for (const cls of testClasses) {
        const expected = loadJsonDirect<RDSInstanceDetails>(
          `instances/${cls}.json`,
        )
        expect(result.get(cls)).toEqual(expected)
      }
    })

    it('should return an empty Map for an empty array', async () => {
      const result = await getRDSInstances([])

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('getRDSFamilies', () => {
    it('should return a Map with correct family data', async () => {
      const testFamilies = ['M5', 'R5'] as RDSInstanceFamily[]
      const result = await getRDSFamilies(testFamilies)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(2)

      for (const family of testFamilies) {
        const expected = loadJsonDirect<RDSFamilyData>(
          `families/${family}.json`,
        )
        expect(result.get(family)).toEqual(expected)
      }
    })

    it('should return an empty Map for an empty array', async () => {
      const result = await getRDSFamilies([])

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('Re-exported cache utilities', () => {
    it('should re-export clearRDSCache', async () => {
      const { clearRDSCache: reExported } = await import('../lib/rds.async.js')
      expect(typeof reExported).toBe('function')
    })

    it('should re-export getRDSCacheStats', async () => {
      const { getRDSCacheStats: reExported } = await import(
        '../lib/rds.async.js'
      )
      expect(typeof reExported).toBe('function')
    })
  })
})
