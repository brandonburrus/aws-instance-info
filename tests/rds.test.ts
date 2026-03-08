import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// NOTE: The sync wrapper functions in rds.ts use make-synchronous, which spawns
// a worker thread. MSW intercepts fetch at the main thread level only and does NOT
// intercept requests inside worker threads. Therefore, sync wrapper tests that make
// network calls will hit the real network unless mocked differently.
//
// Strategy: These tests verify exported function shapes and call-through behavior.
// For data-correctness coverage, the async tests (rds.async.test.ts) provide
// comprehensive coverage via MSW-intercepted fixtures.

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

describe('RDS Module (sync wrappers)', () => {
  beforeEach(() => {
    clearRDSCache()
  })

  afterEach(() => {
    clearRDSCache()
  })

  describe('exports', () => {
    it('should export getRDSInfo as a function', () => {
      expect(typeof getRDSInfo).toBe('function')
    })

    it('should export getRDSInstanceInfo as a function', () => {
      expect(typeof getRDSInstanceInfo).toBe('function')
    })

    it('should export getRDSFamily as a function', () => {
      expect(typeof getRDSFamily).toBe('function')
    })

    it('should export getRDSFamilyInstanceClasses as a function', () => {
      expect(typeof getRDSFamilyInstanceClasses).toBe('function')
    })

    it('should export getRDSFamilyCategory as a function', () => {
      expect(typeof getRDSFamilyCategory).toBe('function')
    })

    it('should export getAllRDSFamilies as a function', () => {
      expect(typeof getAllRDSFamilies).toBe('function')
    })

    it('should export getAllRDSInstanceClasses as a function', () => {
      expect(typeof getAllRDSInstanceClasses).toBe('function')
    })

    it('should export getAllRDSCategories as a function', () => {
      expect(typeof getAllRDSCategories).toBe('function')
    })

    it('should export isValidRDSInstanceClass as a function', () => {
      expect(typeof isValidRDSInstanceClass).toBe('function')
    })

    it('should export isValidRDSFamily as a function', () => {
      expect(typeof isValidRDSFamily).toBe('function')
    })

    it('should export getRDSInstances as a function', () => {
      expect(typeof getRDSInstances).toBe('function')
    })

    it('should export getRDSFamilies as a function', () => {
      expect(typeof getRDSFamilies).toBe('function')
    })

    it('should export clearRDSCache as a function', () => {
      expect(typeof clearRDSCache).toBe('function')
    })

    it('should export getRDSCacheStats as a function', () => {
      expect(typeof getRDSCacheStats).toBe('function')
    })
  })

  describe('getRDSInfo', () => {
    it('should return arrays for families, instances, and categories', () => {
      const info = getRDSInfo()

      expect(Array.isArray(info.families)).toBe(true)
      expect(Array.isArray(info.instances)).toBe(true)
      expect(Array.isArray(info.categories)).toBe(true)
      expect(info.families.length).toBeGreaterThan(0)
      expect(info.instances.length).toBeGreaterThan(0)
      expect(info.categories.length).toBeGreaterThan(0)
    })

    it('should include expected categories', () => {
      const info = getRDSInfo()
      expect(info.categories).toContain('general_purpose')
      expect(info.categories).toContain('memory_optimized')
      expect(info.categories).toContain('burstable_performance')
    })
  })

  describe('getRDSInstanceInfo', () => {
    it('should return instance details with correct shape', () => {
      const info = getRDSInfo()
      const firstClass = info.instances[0]
      if (!firstClass) return

      const instance = getRDSInstanceInfo(firstClass)
      expect(instance).toHaveProperty('instanceClass')
      expect(instance).toHaveProperty('family')
      expect(instance).toHaveProperty('category')
      expect(instance).toHaveProperty('vCPUs')
      expect(instance).toHaveProperty('memoryGiB')
      expect(instance).toHaveProperty('networkBandwidthGbps')
      expect(instance).toHaveProperty('ebsBandwidthMbps')
    })

    it('should throw for unknown instance classes', () => {
      expect(() => getRDSInstanceInfo('db.invalid.large')).toThrow(
        'Unknown RDS instance class',
      )
    })
  })

  describe('getRDSFamily', () => {
    it('should return family data with correct shape', () => {
      const info = getRDSInfo()
      const firstFamily = info.families[0]
      if (!firstFamily) return

      const family = getRDSFamily(firstFamily)
      expect(family).toHaveProperty('family')
      expect(family).toHaveProperty('category')
      expect(family).toHaveProperty('instanceClasses')
      expect(Array.isArray(family.instanceClasses)).toBe(true)
    })

    it('should throw for unknown families', () => {
      expect(() => getRDSFamily('InvalidFamily')).toThrow(
        'Unknown RDS instance family',
      )
    })
  })

  describe('getRDSFamilyInstanceClasses', () => {
    it('should return an array of instance classes', () => {
      const info = getRDSInfo()
      const firstFamily = info.families[0]
      if (!firstFamily) return

      const classes = getRDSFamilyInstanceClasses(firstFamily)
      expect(Array.isArray(classes)).toBe(true)
      expect(classes.length).toBeGreaterThan(0)
    })
  })

  describe('getRDSFamilyCategory', () => {
    it('should return a valid category string', () => {
      const info = getRDSInfo()
      const firstFamily = info.families[0]
      if (!firstFamily) return

      const category = getRDSFamilyCategory(firstFamily)
      expect(typeof category).toBe('string')
      expect(info.categories).toContain(category)
    })
  })

  describe('getAllRDSFamilies', () => {
    it('should return a non-empty array', () => {
      const families = getAllRDSFamilies()
      expect(Array.isArray(families)).toBe(true)
      expect(families.length).toBeGreaterThan(0)
    })
  })

  describe('getAllRDSInstanceClasses', () => {
    it('should return a non-empty array', () => {
      const classes = getAllRDSInstanceClasses()
      expect(Array.isArray(classes)).toBe(true)
      expect(classes.length).toBeGreaterThan(0)
    })
  })

  describe('getAllRDSCategories', () => {
    it('should return expected category values', () => {
      const categories = getAllRDSCategories()
      expect(categories).toContain('general_purpose')
      expect(categories).toContain('memory_optimized')
      expect(categories).toContain('burstable_performance')
    })
  })

  describe('isValidRDSInstanceClass', () => {
    it('should return true for valid instance classes', () => {
      const info = getRDSInfo()
      const firstClass = info.instances[0]
      if (!firstClass) return
      expect(isValidRDSInstanceClass(firstClass)).toBe(true)
    })

    it('should return false for invalid instance classes', () => {
      expect(isValidRDSInstanceClass('invalid.instance')).toBe(false)
      expect(isValidRDSInstanceClass('')).toBe(false)
    })
  })

  describe('isValidRDSFamily', () => {
    it('should return true for valid families', () => {
      const info = getRDSInfo()
      const firstFamily = info.families[0]
      if (!firstFamily) return
      expect(isValidRDSFamily(firstFamily)).toBe(true)
    })

    it('should return false for invalid families', () => {
      expect(isValidRDSFamily('Invalid')).toBe(false)
      expect(isValidRDSFamily('')).toBe(false)
    })
  })

  describe('getRDSInstances', () => {
    it('should return a Map with correct instance data', () => {
      const info = getRDSInfo()
      const testClasses = info.instances.slice(0, 2)
      const result = getRDSInstances(testClasses)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(testClasses.length)

      for (const cls of testClasses) {
        const inst = result.get(cls)
        expect(inst?.instanceClass).toBe(cls)
      }
    })

    it('should return an empty Map for an empty array', () => {
      const result = getRDSInstances([])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('getRDSFamilies', () => {
    it('should return a Map with correct family data', () => {
      const info = getRDSInfo()
      const testFamilies = info.families.slice(0, 2)
      const result = getRDSFamilies(testFamilies)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(testFamilies.length)

      for (const family of testFamilies) {
        const fd = result.get(family)
        expect(fd?.family).toBe(family)
      }
    })

    it('should return an empty Map for an empty array', () => {
      const result = getRDSFamilies([])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('clearRDSCache and getRDSCacheStats', () => {
    it('stats should have instanceCacheSize and familyCacheSize', () => {
      const stats = getRDSCacheStats()
      expect(typeof stats.instanceCacheSize).toBe('number')
      expect(typeof stats.familyCacheSize).toBe('number')
    })

    it('clearRDSCache resets cache sizes to 0', () => {
      clearRDSCache()
      const stats = getRDSCacheStats()
      expect(stats.instanceCacheSize).toBe(0)
      expect(stats.familyCacheSize).toBe(0)
    })

    it('Data integrity: families listed in info match family data', () => {
      const info = getRDSInfo()
      // Check a few families for consistency
      for (const familyName of info.families.slice(0, 3)) {
        const family = getRDSFamily(familyName)
        expect(family.family).toBe(familyName)
        expect(info.categories).toContain(family.category)

        for (const instanceClass of family.instanceClasses) {
          expect(info.instances).toContain(instanceClass)
          const instance = getRDSInstanceInfo(instanceClass)
          expect(instance.family).toBe(familyName)
          expect(instance.category).toBe(family.category)
        }
      }
    })
  })
})
