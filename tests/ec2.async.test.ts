import { afterEach, beforeEach, describe, expect, it } from 'vitest'

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
} from '../lib/ec2.async.js'

// MSW is set up in tests/setup.ts via vitest setupFiles
// Fixtures contain: m5.large, m5.xlarge (M5 family), c5.large, c5.xlarge (C5 family),
// r5.large, r5.xlarge (R5), i3.large, i3.xlarge (I3), p3.2xlarge (P3), hpc6a.48xlarge (Hpc6a)

describe('EC2 Async Module', () => {
  beforeEach(() => {
    clearEC2Cache()
  })

  afterEach(() => {
    clearEC2Cache()
  })

  describe('getEC2Info', () => {
    it('should return arrays for families, instances, and categories', async () => {
      const info = await getEC2Info()

      expect(Array.isArray(info.families)).toBe(true)
      expect(Array.isArray(info.instances)).toBe(true)
      expect(Array.isArray(info.categories)).toBe(true)
      expect(info.families.length).toBeGreaterThan(0)
      expect(info.instances.length).toBeGreaterThan(0)
      expect(info.categories.length).toBeGreaterThan(0)
    })

    it('should include expected families from fixtures', async () => {
      const info = await getEC2Info()
      expect(info.families).toContain('M5')
      expect(info.families).toContain('C5')
      expect(info.families).toContain('R5')
    })

    it('should include expected instances from fixtures', async () => {
      const info = await getEC2Info()
      expect(info.instances).toContain('m5.large')
      expect(info.instances).toContain('c5.large')
      expect(info.instances).toContain('r5.large')
    })

    it('should include expected categories', async () => {
      const info = await getEC2Info()
      expect(info.categories).toContain('general_purpose')
      expect(info.categories).toContain('compute_optimized')
      expect(info.categories).toContain('memory_optimized')
    })

    it('should cache the info and return the same object on subsequent calls', async () => {
      const first = await getEC2Info()
      const second = await getEC2Info()
      expect(first).toBe(second)
    })
  })

  describe('getEC2InstanceInfo', () => {
    it('should return instance details for m5.large', async () => {
      const instance = await getEC2InstanceInfo('m5.large')
      expect(instance.instanceType).toBe('m5.large')
      expect(instance.family).toBe('M5')
      expect(instance.category).toBe('general_purpose')
      expect(instance.vCPUs).toBe(2)
      expect(instance.memoryGiB).toBe(8)
    })

    it('should return instance details for c5.large', async () => {
      const instance = await getEC2InstanceInfo('c5.large')
      expect(instance.instanceType).toBe('c5.large')
      expect(instance.family).toBe('C5')
      expect(instance.category).toBe('compute_optimized')
    })

    it('should throw for unknown instance types', async () => {
      await expect(getEC2InstanceInfo('invalid.type')).rejects.toThrow(
        'Unknown EC2 instance type',
      )
    })

    it('should cache instance data', async () => {
      await getEC2InstanceInfo('m5.large')
      const stats = getEC2CacheStats()
      expect(stats.instanceCacheSize).toBeGreaterThanOrEqual(1)
    })

    it('should return cached data on subsequent calls', async () => {
      const first = await getEC2InstanceInfo('m5.large')
      const second = await getEC2InstanceInfo('m5.large')
      expect(first).toBe(second)
    })

    it('should include all expected properties', async () => {
      const instance = await getEC2InstanceInfo('m5.large')
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
  })

  describe('getEC2Family', () => {
    it('should return family data for M5', async () => {
      const family = await getEC2Family('M5')
      expect(family.family).toBe('M5')
      expect(family.category).toBe('general_purpose')
      expect(Array.isArray(family.instanceTypes)).toBe(true)
      expect(family.instanceTypes).toContain('m5.large')
      expect(family.instanceTypes).toContain('m5.xlarge')
    })

    it('should throw for unknown families', async () => {
      await expect(getEC2Family('InvalidFamily')).rejects.toThrow(
        'Unknown EC2 instance family',
      )
    })

    it('should cache family data', async () => {
      await getEC2Family('M5')
      const stats = getEC2CacheStats()
      expect(stats.familyCacheSize).toBeGreaterThanOrEqual(1)
    })

    it('should return cached data on subsequent calls', async () => {
      const first = await getEC2Family('M5')
      const second = await getEC2Family('M5')
      expect(first).toBe(second)
    })

    it('should include all expected properties', async () => {
      const family = await getEC2Family('M5')
      expect(family).toHaveProperty('family')
      expect(family).toHaveProperty('category')
      expect(family).toHaveProperty('instanceTypes')
      expect(family).toHaveProperty('hypervisor')
      expect(family).toHaveProperty('processorArchitecture')
      expect(Array.isArray(family.instanceTypes)).toBe(true)
    })
  })

  describe('getEC2FamilyInstanceTypes', () => {
    it('should return instance types for M5 family', async () => {
      const types = await getEC2FamilyInstanceTypes('M5')
      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)
      expect(types).toContain('m5.large')
    })
  })

  describe('getEC2FamilyCategory', () => {
    it('should return general_purpose for M5', async () => {
      const category = await getEC2FamilyCategory('M5')
      expect(category).toBe('general_purpose')
    })

    it('should return compute_optimized for C5', async () => {
      const category = await getEC2FamilyCategory('C5')
      expect(category).toBe('compute_optimized')
    })

    it('should return memory_optimized for R5', async () => {
      const category = await getEC2FamilyCategory('R5')
      expect(category).toBe('memory_optimized')
    })
  })

  describe('getAllEC2Families', () => {
    it('should return all families', async () => {
      const families = await getAllEC2Families()
      expect(Array.isArray(families)).toBe(true)
      expect(families.length).toBeGreaterThan(0)
      expect(families).toContain('M5')
    })
  })

  describe('getAllEC2InstanceTypes', () => {
    it('should return all instance types', async () => {
      const types = await getAllEC2InstanceTypes()
      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)
      expect(types).toContain('m5.large')
    })
  })

  describe('getAllEC2Categories', () => {
    it('should return all categories', async () => {
      const categories = await getAllEC2Categories()
      expect(categories).toContain('general_purpose')
      expect(categories).toContain('compute_optimized')
      expect(categories).toContain('memory_optimized')
      expect(categories).toContain('storage_optimized')
      expect(categories).toContain('accelerated_computing')
      expect(categories).toContain('hpc')
    })
  })

  describe('isValidEC2InstanceType', () => {
    it('should return true for valid instance types', async () => {
      expect(await isValidEC2InstanceType('m5.large')).toBe(true)
      expect(await isValidEC2InstanceType('c5.large')).toBe(true)
    })

    it('should return false for invalid instance types', async () => {
      expect(await isValidEC2InstanceType('invalid.instance')).toBe(false)
      expect(await isValidEC2InstanceType('m5.invalid')).toBe(false)
      expect(await isValidEC2InstanceType('')).toBe(false)
    })
  })

  describe('isValidEC2Family', () => {
    it('should return true for valid families', async () => {
      expect(await isValidEC2Family('M5')).toBe(true)
      expect(await isValidEC2Family('C5')).toBe(true)
    })

    it('should return false for invalid families', async () => {
      expect(await isValidEC2Family('Invalid')).toBe(false)
      expect(await isValidEC2Family('m5')).toBe(false)
      expect(await isValidEC2Family('')).toBe(false)
    })
  })

  describe('getEC2Instances', () => {
    it('should return a Map with correct instance data', async () => {
      const result = await getEC2Instances(['m5.large', 'm5.xlarge'])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(2)
      expect(result.get('m5.large')?.instanceType).toBe('m5.large')
      expect(result.get('m5.xlarge')?.instanceType).toBe('m5.xlarge')
    })

    it('should return an empty Map for an empty array', async () => {
      const result = await getEC2Instances([])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('getEC2Families', () => {
    it('should return a Map with correct family data', async () => {
      const result = await getEC2Families(['M5', 'C5'])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(2)
      expect(result.get('M5')?.family).toBe('M5')
      expect(result.get('C5')?.family).toBe('C5')
    })

    it('should return an empty Map for an empty array', async () => {
      const result = await getEC2Families([])
      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('clearEC2Cache and getEC2CacheStats', () => {
    it('should export clearEC2Cache as a function', async () => {
      const { clearEC2Cache: fn } = await import('../lib/ec2.async.js')
      expect(typeof fn).toBe('function')
    })

    it('should export getEC2CacheStats as a function', async () => {
      const { getEC2CacheStats: fn } = await import('../lib/ec2.async.js')
      expect(typeof fn).toBe('function')
    })

    it('stats should have instanceCacheSize and familyCacheSize', async () => {
      await getEC2InstanceInfo('m5.large')
      await getEC2Family('M5')
      const stats = getEC2CacheStats()
      expect(typeof stats.instanceCacheSize).toBe('number')
      expect(typeof stats.familyCacheSize).toBe('number')
      expect(stats.instanceCacheSize).toBeGreaterThanOrEqual(1)
      expect(stats.familyCacheSize).toBeGreaterThanOrEqual(1)
    })

    it('clearEC2Cache resets cache sizes to 0', async () => {
      await getEC2InstanceInfo('m5.large')
      clearEC2Cache()
      const stats = getEC2CacheStats()
      expect(stats.instanceCacheSize).toBe(0)
      expect(stats.familyCacheSize).toBe(0)
    })
  })
})
