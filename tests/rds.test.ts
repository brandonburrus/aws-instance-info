import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  clearRDSCache,
  getAllRDSCategories,
  getAllRDSFamilies,
  getAllRDSInstanceClasses,
  getRDSCacheStats,
  getRDSFamilies,
  getRDSFamily,
  getRDSFamilyCategory,
  getRDSFamilyInstanceClasses,
  getRDSInfo,
  getRDSInstanceInfo,
  getRDSInstances,
  isValidRDSFamily,
  isValidRDSInstanceClass,
} from '../lib/rds.js'
import type {
  RDSCategory,
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

describe('RDS Module', () => {
  beforeEach(() => {
    clearRDSCache()
  })

  afterEach(() => {
    clearRDSCache()
  })

  describe('getRDSInfo', () => {
    it('should return info matching the JSON file', () => {
      const expected = loadJsonDirect<RDSInfo>('info.json')
      const actual = getRDSInfo()

      expect(actual).toEqual(expected)
    })

    it('should return arrays for families, instances, and categories', () => {
      const info = getRDSInfo()

      expect(Array.isArray(info.families)).toBe(true)
      expect(Array.isArray(info.instances)).toBe(true)
      expect(Array.isArray(info.categories)).toBe(true)
      expect(info.families.length).toBeGreaterThan(0)
      expect(info.instances.length).toBeGreaterThan(0)
      expect(info.categories.length).toBeGreaterThan(0)
    })

    it('should cache the info and return the same object on subsequent calls', () => {
      const first = getRDSInfo()
      const second = getRDSInfo()

      expect(first).toBe(second)
    })
  })

  describe('getRDSInstanceInfo', () => {
    it('should return instance details matching the JSON file for db.m5.large', () => {
      const expected = loadJsonDirect<RDSInstanceDetails>(
        'instances/db.m5.large.json',
      )
      const actual = getRDSInstanceInfo('db.m5.large' as RDSInstanceClass)

      expect(actual).toEqual(expected)
    })

    it('should return correct details for different instance classes', () => {
      const info = getRDSInfo()
      // Test a few different instance classes
      const testInstances = info.instances.slice(0, 5)

      for (const instanceClass of testInstances) {
        const expected = loadJsonDirect<RDSInstanceDetails>(
          `instances/${instanceClass}.json`,
        )
        const actual = getRDSInstanceInfo(instanceClass)

        expect(actual).toEqual(expected)
        expect(actual.instanceClass).toBe(instanceClass)
      }
    })

    it('should cache instance data', () => {
      getRDSInstanceInfo('db.m5.large' as RDSInstanceClass)
      const stats = getRDSCacheStats()

      expect(stats.instances).toBe(1)
    })

    it('should return cached data on subsequent calls', () => {
      const first = getRDSInstanceInfo('db.m5.large' as RDSInstanceClass)
      const second = getRDSInstanceInfo('db.m5.large' as RDSInstanceClass)

      expect(first).toBe(second)
    })

    it('should include all expected properties', () => {
      const instance = getRDSInstanceInfo('db.m5.large' as RDSInstanceClass)

      expect(instance).toHaveProperty('instanceClass')
      expect(instance).toHaveProperty('family')
      expect(instance).toHaveProperty('category')
      expect(instance).toHaveProperty('vCPUs')
      expect(instance).toHaveProperty('memoryGiB')
      expect(instance).toHaveProperty('networkBandwidthGbps')
      expect(instance).toHaveProperty('ebsBandwidthMbps')
    })
  })

  describe('getRDSFamily', () => {
    it('should return family data matching the JSON file for M5', () => {
      const expected = loadJsonDirect<RDSFamilyData>('families/M5.json')
      const actual = getRDSFamily('M5' as RDSInstanceFamily)

      expect(actual).toEqual(expected)
    })

    it('should return correct data for different families', () => {
      const info = getRDSInfo()
      // Test a few different families
      const testFamilies = info.families.slice(0, 5)

      for (const family of testFamilies) {
        const expected = loadJsonDirect<RDSFamilyData>(
          `families/${family}.json`,
        )
        const actual = getRDSFamily(family)

        expect(actual).toEqual(expected)
        expect(actual.family).toBe(family)
      }
    })

    it('should cache family data', () => {
      getRDSFamily('M5' as RDSInstanceFamily)
      const stats = getRDSCacheStats()

      expect(stats.families).toBe(1)
    })

    it('should return cached data on subsequent calls', () => {
      const first = getRDSFamily('M5' as RDSInstanceFamily)
      const second = getRDSFamily('M5' as RDSInstanceFamily)

      expect(first).toBe(second)
    })

    it('should include all expected properties', () => {
      const family = getRDSFamily('M5' as RDSInstanceFamily)

      expect(family).toHaveProperty('family')
      expect(family).toHaveProperty('category')
      expect(family).toHaveProperty('instanceClasses')
      expect(Array.isArray(family.instanceClasses)).toBe(true)
    })
  })

  describe('getRDSFamilyInstanceClasses', () => {
    it('should return instance classes matching the family JSON file', () => {
      const expected = loadJsonDirect<RDSFamilyData>('families/M5.json')
      const actual = getRDSFamilyInstanceClasses('M5' as RDSInstanceFamily)

      expect(actual).toEqual(expected.instanceClasses)
    })

    it('should return an array of instance classes', () => {
      const classes = getRDSFamilyInstanceClasses('M5' as RDSInstanceFamily)

      expect(Array.isArray(classes)).toBe(true)
      expect(classes.length).toBeGreaterThan(0)
      expect(classes.every(c => c.toLowerCase().includes('.m5.'))).toBe(true)
    })
  })

  describe('getRDSFamilyCategory', () => {
    it('should return category matching the family JSON file', () => {
      const expected = loadJsonDirect<RDSFamilyData>('families/M5.json')
      const actual = getRDSFamilyCategory('M5' as RDSInstanceFamily)

      expect(actual).toBe(expected.category)
    })

    it('should return correct categories for different family types', () => {
      // Test general purpose
      expect(getRDSFamilyCategory('M5' as RDSInstanceFamily)).toBe(
        'general_purpose',
      )

      // Test memory optimized
      expect(getRDSFamilyCategory('R5' as RDSInstanceFamily)).toBe(
        'memory_optimized',
      )

      // Test burstable
      expect(getRDSFamilyCategory('T3' as RDSInstanceFamily)).toBe(
        'burstable_performance',
      )
    })
  })

  describe('getAllRDSFamilies', () => {
    it('should return all families from the info JSON', () => {
      const expected = loadJsonDirect<RDSInfo>('info.json')
      const actual = getAllRDSFamilies()

      expect(actual).toEqual(expected.families)
    })

    it('should return a non-empty array', () => {
      const families = getAllRDSFamilies()

      expect(Array.isArray(families)).toBe(true)
      expect(families.length).toBeGreaterThan(0)
    })
  })

  describe('getAllRDSInstanceClasses', () => {
    it('should return all instance classes from the info JSON', () => {
      const expected = loadJsonDirect<RDSInfo>('info.json')
      const actual = getAllRDSInstanceClasses()

      expect(actual).toEqual(expected.instances)
    })

    it('should return a non-empty array', () => {
      const classes = getAllRDSInstanceClasses()

      expect(Array.isArray(classes)).toBe(true)
      expect(classes.length).toBeGreaterThan(0)
    })
  })

  describe('getAllRDSCategories', () => {
    it('should return all categories from the info JSON', () => {
      const expected = loadJsonDirect<RDSInfo>('info.json')
      const actual = getAllRDSCategories()

      expect(actual).toEqual(expected.categories)
    })

    it('should return expected category values', () => {
      const categories = getAllRDSCategories()

      expect(categories).toContain('general_purpose')
      expect(categories).toContain('memory_optimized')
      expect(categories).toContain('burstable_performance')
    })
  })

  describe('isValidRDSInstanceClass', () => {
    it('should return true for valid instance classes', () => {
      const info = loadJsonDirect<RDSInfo>('info.json')

      for (const instanceClass of info.instances.slice(0, 10)) {
        expect(isValidRDSInstanceClass(instanceClass)).toBe(true)
      }
    })

    it('should return false for invalid instance classes', () => {
      expect(isValidRDSInstanceClass('invalid.instance')).toBe(false)
      expect(isValidRDSInstanceClass('db.m5.invalid')).toBe(false)
      expect(isValidRDSInstanceClass('')).toBe(false)
      expect(isValidRDSInstanceClass('random')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidRDSInstanceClass('DB.M5.LARGE')).toBe(false) // Case sensitive
      expect(isValidRDSInstanceClass('db.m5.large')).toBe(true)
    })
  })

  describe('isValidRDSFamily', () => {
    it('should return true for valid families', () => {
      const info = loadJsonDirect<RDSInfo>('info.json')

      for (const family of info.families.slice(0, 10)) {
        expect(isValidRDSFamily(family)).toBe(true)
      }
    })

    it('should return false for invalid families', () => {
      expect(isValidRDSFamily('Invalid')).toBe(false)
      expect(isValidRDSFamily('')).toBe(false)
      expect(isValidRDSFamily('m5')).toBe(false) // Case sensitive
      expect(isValidRDSFamily('random')).toBe(false)
    })

    it('should handle case sensitivity', () => {
      expect(isValidRDSFamily('M5')).toBe(true)
      expect(isValidRDSFamily('m5')).toBe(false)
    })
  })

  describe('getRDSInstances', () => {
    it('should return a Map with correct instance data', () => {
      const testClasses = [
        'db.m5.large',
        'db.m5.xlarge',
        'db.r5.large',
      ] as RDSInstanceClass[]
      const result = getRDSInstances(testClasses)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(3)

      for (const cls of testClasses) {
        const expected = loadJsonDirect<RDSInstanceDetails>(
          `instances/${cls}.json`,
        )
        expect(result.get(cls)).toEqual(expected)
      }
    })

    it('should return an empty Map for an empty array', () => {
      const result = getRDSInstances([])

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })

    it('should cache all fetched instances', () => {
      const testClasses = ['db.m5.large', 'db.m5.xlarge'] as RDSInstanceClass[]
      getRDSInstances(testClasses)
      const stats = getRDSCacheStats()

      expect(stats.instances).toBe(2)
    })
  })

  describe('getRDSFamilies', () => {
    it('should return a Map with correct family data', () => {
      const testFamilies = ['M5', 'R5', 'T3'] as RDSInstanceFamily[]
      const result = getRDSFamilies(testFamilies)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(3)

      for (const family of testFamilies) {
        const expected = loadJsonDirect<RDSFamilyData>(
          `families/${family}.json`,
        )
        expect(result.get(family)).toEqual(expected)
      }
    })

    it('should return an empty Map for an empty array', () => {
      const result = getRDSFamilies([])

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })

    it('should cache all fetched families', () => {
      const testFamilies = ['M5', 'R5'] as RDSInstanceFamily[]
      getRDSFamilies(testFamilies)
      const stats = getRDSCacheStats()

      expect(stats.families).toBe(2)
    })
  })

  describe('clearRDSCache', () => {
    it('should clear all cached data', () => {
      // Populate cache
      getRDSInfo()
      getRDSInstanceInfo('db.m5.large' as RDSInstanceClass)
      getRDSFamily('M5' as RDSInstanceFamily)

      let stats = getRDSCacheStats()
      expect(stats.instances).toBe(1)
      expect(stats.families).toBe(1)
      expect(stats.infoLoaded).toBe(true)

      // Clear cache
      clearRDSCache()

      stats = getRDSCacheStats()
      expect(stats.instances).toBe(0)
      expect(stats.families).toBe(0)
      expect(stats.infoLoaded).toBe(false)
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

    it('should return correct stats after loading data', () => {
      getRDSInfo()
      getRDSInstanceInfo('db.m5.large' as RDSInstanceClass)
      getRDSInstanceInfo('db.m5.xlarge' as RDSInstanceClass)
      getRDSFamily('M5' as RDSInstanceFamily)

      const stats = getRDSCacheStats()

      expect(stats).toEqual({
        instances: 2,
        families: 1,
        infoLoaded: true,
      })
    })
  })

  describe('Data Integrity', () => {
    it('should have consistent data between instance and family files', () => {
      const info = getRDSInfo()

      // Check a few families
      for (const familyName of info.families.slice(0, 5)) {
        const family = getRDSFamily(familyName)

        // Each instance in the family should exist and have the correct family
        for (const instanceClass of family.instanceClasses) {
          expect(info.instances).toContain(instanceClass)

          const instance = getRDSInstanceInfo(instanceClass)
          expect(instance.family).toBe(familyName)
          expect(instance.category).toBe(family.category)
        }
      }
    })

    it('should have valid categories for all families', () => {
      const info = getRDSInfo()
      const validCategories = new Set(info.categories)

      for (const familyName of info.families.slice(0, 10)) {
        const category = getRDSFamilyCategory(familyName)
        expect(validCategories.has(category)).toBe(true)
      }
    })
  })
})
