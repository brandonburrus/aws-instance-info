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
} from '../lib/rds.async.js'

// MSW is set up in tests/setup.ts via vitest setupFiles
// Fixtures contain: db.m5.large, db.m5.xlarge, db.m5.2xlarge (M5 family),
// db.r5.large, db.r5.xlarge (R5 family), db.t3.micro, db.t3.small (T3 family)

describe('RDS Async Module', () => {
  beforeEach(() => {
    clearRDSCache()
  })

  afterEach(() => {
    clearRDSCache()
  })

  describe('getRDSInfo', () => {
    it('should return arrays for families, instances, and categories', async () => {
      const info = await getRDSInfo()

      expect(Array.isArray(info.families)).toBe(true)
      expect(Array.isArray(info.instances)).toBe(true)
      expect(Array.isArray(info.categories)).toBe(true)
      expect(info.families.length).toBeGreaterThan(0)
      expect(info.instances.length).toBeGreaterThan(0)
      expect(info.categories.length).toBeGreaterThan(0)
    })

    it('should include expected families from fixtures', async () => {
      const info = await getRDSInfo()
      expect(info.families).toContain('M5')
      expect(info.families).toContain('R5')
      expect(info.families).toContain('T3')
    })

    it('should include expected instances from fixtures', async () => {
      const info = await getRDSInfo()
      expect(info.instances).toContain('db.m5.large')
      expect(info.instances).toContain('db.r5.large')
      expect(info.instances).toContain('db.t3.micro')
    })

    it('should include expected categories', async () => {
      const info = await getRDSInfo()
      expect(info.categories).toContain('general_purpose')
      expect(info.categories).toContain('memory_optimized')
      expect(info.categories).toContain('burstable_performance')
    })

    it('should cache the info and return the same object on subsequent calls', async () => {
      const first = await getRDSInfo()
      const second = await getRDSInfo()
      expect(first).toBe(second)
    })
  })

  describe('getRDSInstanceInfo', () => {
    it('should return instance details for db.m5.large', async () => {
      const instance = await getRDSInstanceInfo('db.m5.large')
      expect(instance.instanceClass).toBe('db.m5.large')
      expect(instance.family).toBe('M5')
      expect(instance.category).toBe('general_purpose')
      expect(instance.vCPUs).toBe(2)
      expect(instance.memoryGiB).toBe(8)
    })

    it('should return instance details for db.r5.large', async () => {
      const instance = await getRDSInstanceInfo('db.r5.large')
      expect(instance.instanceClass).toBe('db.r5.large')
      expect(instance.family).toBe('R5')
      expect(instance.category).toBe('memory_optimized')
    })

    it('should return instance details for db.t3.micro', async () => {
      const instance = await getRDSInstanceInfo('db.t3.micro')
      expect(instance.instanceClass).toBe('db.t3.micro')
      expect(instance.family).toBe('T3')
      expect(instance.category).toBe('burstable_performance')
    })

    it('should throw for unknown instance classes', async () => {
      await expect(getRDSInstanceInfo('db.invalid.large')).rejects.toThrow(
        'Unknown RDS instance class',
      )
    })

    it('should cache instance data', async () => {
      await getRDSInstanceInfo('db.m5.large')
      const stats = getRDSCacheStats()
      expect(stats.instanceCacheSize).toBeGreaterThanOrEqual(1)
    })

    it('should return cached data on subsequent calls', async () => {
      const first = await getRDSInstanceInfo('db.m5.large')
      const second = await getRDSInstanceInfo('db.m5.large')
      expect(first).toBe(second)
    })

    it('should include all expected properties', async () => {
      const instance = await getRDSInstanceInfo('db.m5.large')
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
    it('should return family data for M5', async () => {
      const family = await getRDSFamily('M5')
      expect(family.family).toBe('M5')
      expect(family.category).toBe('general_purpose')
      expect(Array.isArray(family.instanceClasses)).toBe(true)
      expect(family.instanceClasses).toContain('db.m5.large')
      expect(family.instanceClasses).toContain('db.m5.xlarge')
    })

    it('should throw for unknown families', async () => {
      await expect(getRDSFamily('InvalidFamily')).rejects.toThrow(
        'Unknown RDS instance family',
      )
    })

    it('should cache family data', async () => {
      await getRDSFamily('M5')
      const stats = getRDSCacheStats()
      expect(stats.familyCacheSize).toBeGreaterThanOrEqual(1)
    })

    it('should return cached data on subsequent calls', async () => {
      const first = await getRDSFamily('M5')
      const second = await getRDSFamily('M5')
      expect(first).toBe(second)
    })

    it('should include all expected properties', async () => {
      const family = await getRDSFamily('M5')
      expect(family).toHaveProperty('family')
      expect(family).toHaveProperty('category')
      expect(family).toHaveProperty('instanceClasses')
      expect(Array.isArray(family.instanceClasses)).toBe(true)
    })
  })

  describe('getRDSFamilyInstanceClasses', () => {
    it('should return instance classes for M5 family', async () => {
      const classes = await getRDSFamilyInstanceClasses('M5')
      expect(Array.isArray(classes)).toBe(true)
      expect(classes.length).toBeGreaterThan(0)
      expect(classes).toContain('db.m5.large')
      expect(classes.every(c => c.toLowerCase().includes('.m5.'))).toBe(true)
    })
  })

  describe('getRDSFamilyCategory', () => {
    it('should return general_purpose for M5', async () => {
      const category = await getRDSFamilyCategory('M5')
      expect(category).toBe('general_purpose')
    })

    it('should return memory_optimized for R5', async () => {
      const category = await getRDSFamilyCategory('R5')
      expect(category).toBe('memory_optimized')
    })

    it('should return burstable_performance for T3', async () => {
      const category = await getRDSFamilyCategory('T3')
      expect(category).toBe('burstable_performance')
    })
  })

  describe('getAllRDSFamilies', () => {
    it('should return all families', async () => {
      const families = await getAllRDSFamilies()
      expect(Array.isArray(families)).toBe(true)
      expect(families.length).toBeGreaterThan(0)
      expect(families).toContain('M5')
    })
  })

  describe('getAllRDSInstanceClasses', () => {
    it('should return all instance classes', async () => {
      const classes = await getAllRDSInstanceClasses()
      expect(Array.isArray(classes)).toBe(true)
      expect(classes.length).toBeGreaterThan(0)
      expect(classes).toContain('db.m5.large')
    })
  })

  describe('getAllRDSCategories', () => {
    it('should return all categories', async () => {
      const categories = await getAllRDSCategories()
      expect(categories).toContain('general_purpose')
      expect(categories).toContain('memory_optimized')
      expect(categories).toContain('burstable_performance')
    })
  })

  describe('isValidRDSInstanceClass', () => {
    it('should return true for valid instance classes', async () => {
      expect(await isValidRDSInstanceClass('db.m5.large')).toBe(true)
      expect(await isValidRDSInstanceClass('db.r5.large')).toBe(true)
    })

    it('should return false for invalid instance classes', async () => {
      expect(await isValidRDSInstanceClass('invalid.instance')).toBe(false)
      expect(await isValidRDSInstanceClass('db.m5.invalid')).toBe(false)
      expect(await isValidRDSInstanceClass('')).toBe(false)
    })
  })

  describe('isValidRDSFamily', () => {
    it('should return true for valid families', async () => {
      expect(await isValidRDSFamily('M5')).toBe(true)
      expect(await isValidRDSFamily('R5')).toBe(true)
    })

    it('should return false for invalid families', async () => {
      expect(await isValidRDSFamily('Invalid')).toBe(false)
      expect(await isValidRDSFamily('m5')).toBe(false)
      expect(await isValidRDSFamily('')).toBe(false)
    })
  })

  describe('getRDSInstances', () => {
    it('should return a Map with correct instance data', async () => {
      const result = await getRDSInstances(['db.m5.large', 'db.m5.xlarge'])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(2)
      expect(result.get('db.m5.large')?.instanceClass).toBe('db.m5.large')
      expect(result.get('db.m5.xlarge')?.instanceClass).toBe('db.m5.xlarge')
    })

    it('should return an empty Map for an empty array', async () => {
      const result = await getRDSInstances([])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('getRDSFamilies', () => {
    it('should return a Map with correct family data', async () => {
      const result = await getRDSFamilies(['M5', 'R5'])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(2)
      expect(result.get('M5')?.family).toBe('M5')
      expect(result.get('R5')?.family).toBe('R5')
    })

    it('should return an empty Map for an empty array', async () => {
      const result = await getRDSFamilies([])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('clearRDSCache and getRDSCacheStats', () => {
    it('should export clearRDSCache as a function', async () => {
      const { clearRDSCache: fn } = await import('../lib/rds.async.js')
      expect(typeof fn).toBe('function')
    })

    it('should export getRDSCacheStats as a function', async () => {
      const { getRDSCacheStats: fn } = await import('../lib/rds.async.js')
      expect(typeof fn).toBe('function')
    })

    it('stats should have instanceCacheSize and familyCacheSize', async () => {
      await getRDSInstanceInfo('db.m5.large')
      await getRDSFamily('M5')
      const stats = getRDSCacheStats()
      expect(typeof stats.instanceCacheSize).toBe('number')
      expect(typeof stats.familyCacheSize).toBe('number')
      expect(stats.instanceCacheSize).toBeGreaterThanOrEqual(1)
      expect(stats.familyCacheSize).toBeGreaterThanOrEqual(1)
    })

    it('clearRDSCache resets cache sizes to 0', async () => {
      await getRDSInstanceInfo('db.m5.large')
      clearRDSCache()
      const stats = getRDSCacheStats()
      expect(stats.instanceCacheSize).toBe(0)
      expect(stats.familyCacheSize).toBe(0)
    })
  })
})
