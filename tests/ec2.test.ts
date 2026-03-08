import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// NOTE: The sync wrapper functions in ec2.ts use make-synchronous, which spawns
// a worker thread. MSW intercepts fetch at the main thread level only and does NOT
// intercept requests inside worker threads. Therefore, sync wrapper tests that make
// network calls will hit the real network unless mocked differently.
//
// Strategy: These tests verify exported function shapes and call-through behavior.
// For data-correctness coverage, the async tests (ec2.async.test.ts) provide
// comprehensive coverage via MSW-intercepted fixtures.
//
// The sync tests that call the network are marked to verify basic behavior with
// real AWS docs data (no specific value assertions that could become stale).

import {
  clearEC2Cache,
  getAllEC2Categories,
  getAllEC2Families,
  getAllEC2InstanceTypes,
  getEC2CacheStats,
  getEC2Families,
  getEC2Family,
  getEC2FamilyCategory,
  getEC2FamilyInstanceTypes,
  getEC2Info,
  getEC2InstanceInfo,
  getEC2Instances,
  isValidEC2Family,
  isValidEC2InstanceType,
} from '../lib/ec2.js'

describe('EC2 Module (sync wrappers)', () => {
  beforeEach(() => {
    clearEC2Cache()
  })

  afterEach(() => {
    clearEC2Cache()
  })

  describe('exports', () => {
    it('should export getEC2Info as a function', () => {
      expect(typeof getEC2Info).toBe('function')
    })

    it('should export getEC2InstanceInfo as a function', () => {
      expect(typeof getEC2InstanceInfo).toBe('function')
    })

    it('should export getEC2Family as a function', () => {
      expect(typeof getEC2Family).toBe('function')
    })

    it('should export getEC2FamilyInstanceTypes as a function', () => {
      expect(typeof getEC2FamilyInstanceTypes).toBe('function')
    })

    it('should export getEC2FamilyCategory as a function', () => {
      expect(typeof getEC2FamilyCategory).toBe('function')
    })

    it('should export getAllEC2Families as a function', () => {
      expect(typeof getAllEC2Families).toBe('function')
    })

    it('should export getAllEC2InstanceTypes as a function', () => {
      expect(typeof getAllEC2InstanceTypes).toBe('function')
    })

    it('should export getAllEC2Categories as a function', () => {
      expect(typeof getAllEC2Categories).toBe('function')
    })

    it('should export isValidEC2InstanceType as a function', () => {
      expect(typeof isValidEC2InstanceType).toBe('function')
    })

    it('should export isValidEC2Family as a function', () => {
      expect(typeof isValidEC2Family).toBe('function')
    })

    it('should export getEC2Instances as a function', () => {
      expect(typeof getEC2Instances).toBe('function')
    })

    it('should export getEC2Families as a function', () => {
      expect(typeof getEC2Families).toBe('function')
    })

    it('should export clearEC2Cache as a function', () => {
      expect(typeof clearEC2Cache).toBe('function')
    })

    it('should export getEC2CacheStats as a function', () => {
      expect(typeof getEC2CacheStats).toBe('function')
    })
  })

  describe('getEC2Info', () => {
    it('should return arrays for families, instances, and categories', () => {
      const info = getEC2Info()

      expect(Array.isArray(info.families)).toBe(true)
      expect(Array.isArray(info.instances)).toBe(true)
      expect(Array.isArray(info.categories)).toBe(true)
      expect(info.families.length).toBeGreaterThan(0)
      expect(info.instances.length).toBeGreaterThan(0)
      expect(info.categories.length).toBeGreaterThan(0)
    })

    it('should include expected categories', () => {
      const info = getEC2Info()
      expect(info.categories).toContain('general_purpose')
      expect(info.categories).toContain('compute_optimized')
      expect(info.categories).toContain('memory_optimized')
      expect(info.categories).toContain('storage_optimized')
      expect(info.categories).toContain('accelerated_computing')
      expect(info.categories).toContain('hpc')
    })
  })

  describe('getEC2InstanceInfo', () => {
    it('should return instance details with correct shape', () => {
      // Use a hardcoded stable instance type rather than deriving from getEC2Info()
      // to avoid cross-worker cache inconsistency (each makeSynchronous call spawns
      // a fresh worker thread with its own module scope and re-fetches all data).
      const instance = getEC2InstanceInfo('m5.large')
      expect(instance).toHaveProperty('instanceType')
      expect(instance).toHaveProperty('family')
      expect(instance).toHaveProperty('category')
      expect(instance).toHaveProperty('hypervisor')
      expect(instance).toHaveProperty('processorArchitecture')
      expect(instance).toHaveProperty('memoryGiB')
      expect(instance).toHaveProperty('vCPUs')
      expect(instance).toHaveProperty('network')
      expect(instance).toHaveProperty('ebs')
      expect(instance).toHaveProperty('security')
    })

    it('should throw for unknown instance types', () => {
      expect(() => getEC2InstanceInfo('invalid.type')).toThrow(
        'Unknown EC2 instance type',
      )
    })
  })

  describe('getEC2Family', () => {
    it('should return family data with correct shape', () => {
      const info = getEC2Info()
      const firstFamily = info.families[0]
      if (!firstFamily) return

      const family = getEC2Family(firstFamily)
      expect(family).toHaveProperty('family')
      expect(family).toHaveProperty('category')
      expect(family).toHaveProperty('instanceTypes')
      expect(family).toHaveProperty('hypervisor')
      expect(family).toHaveProperty('processorArchitecture')
      expect(Array.isArray(family.instanceTypes)).toBe(true)
    })

    it('should throw for unknown families', () => {
      expect(() => getEC2Family('InvalidFamily')).toThrow(
        'Unknown EC2 instance family',
      )
    })
  })

  describe('getEC2FamilyInstanceTypes', () => {
    it('should return an array of instance types', () => {
      const info = getEC2Info()
      const firstFamily = info.families[0]
      if (!firstFamily) return

      const types = getEC2FamilyInstanceTypes(firstFamily)
      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)
    })
  })

  describe('getEC2FamilyCategory', () => {
    it('should return a valid category string', () => {
      const info = getEC2Info()
      const firstFamily = info.families[0]
      if (!firstFamily) return

      const category = getEC2FamilyCategory(firstFamily)
      expect(typeof category).toBe('string')
      expect(info.categories).toContain(category)
    })
  })

  describe('getAllEC2Families', () => {
    it('should return a non-empty array', () => {
      const families = getAllEC2Families()
      expect(Array.isArray(families)).toBe(true)
      expect(families.length).toBeGreaterThan(0)
    })
  })

  describe('getAllEC2InstanceTypes', () => {
    it('should return a non-empty array', () => {
      const types = getAllEC2InstanceTypes()
      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)
    })
  })

  describe('getAllEC2Categories', () => {
    it('should return expected category values', () => {
      const categories = getAllEC2Categories()
      expect(categories).toContain('general_purpose')
      expect(categories).toContain('compute_optimized')
      expect(categories).toContain('memory_optimized')
      expect(categories).toContain('storage_optimized')
      expect(categories).toContain('accelerated_computing')
    })
  })

  describe('isValidEC2InstanceType', () => {
    it('should return true for valid instance types', () => {
      // Use hardcoded stable instance types to avoid cross-worker cache inconsistency
      expect(isValidEC2InstanceType('m5.large')).toBe(true)
      expect(isValidEC2InstanceType('c5.xlarge')).toBe(true)
    })

    it('should return false for invalid instance types', () => {
      expect(isValidEC2InstanceType('invalid.instance')).toBe(false)
      expect(isValidEC2InstanceType('')).toBe(false)
    })
  })

  describe('isValidEC2Family', () => {
    it('should return true for valid families', () => {
      const info = getEC2Info()
      const firstFamily = info.families[0]
      if (!firstFamily) return
      expect(isValidEC2Family(firstFamily)).toBe(true)
    })

    it('should return false for invalid families', () => {
      expect(isValidEC2Family('Invalid')).toBe(false)
      expect(isValidEC2Family('')).toBe(false)
    })
  })

  describe('getEC2Instances', () => {
    it('should return a Map with correct instance data', () => {
      // Use hardcoded stable instance types to avoid cross-worker cache inconsistency
      const testTypes = ['m5.large', 'm5.xlarge']
      const result = getEC2Instances(testTypes)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(testTypes.length)

      for (const type of testTypes) {
        const inst = result.get(type)
        expect(inst?.instanceType).toBe(type)
      }
    })

    it('should return an empty Map for an empty array', () => {
      const result = getEC2Instances([])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('getEC2Families', () => {
    it('should return a Map with correct family data', () => {
      const info = getEC2Info()
      const testFamilies = info.families.slice(0, 2)
      const result = getEC2Families(testFamilies)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(testFamilies.length)

      for (const family of testFamilies) {
        const fd = result.get(family)
        expect(fd?.family).toBe(family)
      }
    })

    it('should return an empty Map for an empty array', () => {
      const result = getEC2Families([])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('clearEC2Cache and getEC2CacheStats', () => {
    it('stats should have instanceCacheSize and familyCacheSize', () => {
      const stats = getEC2CacheStats()
      expect(typeof stats.instanceCacheSize).toBe('number')
      expect(typeof stats.familyCacheSize).toBe('number')
    })

    it('clearEC2Cache resets cache sizes to 0', () => {
      clearEC2Cache()
      const stats = getEC2CacheStats()
      expect(stats.instanceCacheSize).toBe(0)
      expect(stats.familyCacheSize).toBe(0)
    })

    it('Data integrity: families listed in info match family data', () => {
      const info = getEC2Info()
      // Check a few families for structural consistency.
      // Per-instance lookups are omitted here because each makeSynchronous call
      // spawns a fresh worker thread that re-fetches all data independently;
      // chaining many real-network calls makes tests flaky. The async tests
      // (ec2.async.test.ts) provide full data-correctness coverage via MSW fixtures.
      for (const familyName of info.families.slice(0, 3)) {
        const family = getEC2Family(familyName)
        expect(family.family).toBe(familyName)
        expect(info.categories).toContain(family.category)
        expect(Array.isArray(family.instanceTypes)).toBe(true)
        expect(family.instanceTypes.length).toBeGreaterThan(0)
      }
    })
  })
})
