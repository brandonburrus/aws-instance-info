import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
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
} from '../lib/ec2.js'
import type {
  EC2Category,
  EC2FamilyData,
  EC2Info,
  EC2InstanceDetails,
  EC2InstanceFamily,
  EC2InstanceType,
} from '../lib/types.js'

/* Helper to load JSON directly from data files */
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const EC2_DATA_DIR = join(__dirname, '..', 'data', 'ec2')

function loadJsonDirect<T>(relativePath: string): T {
  const fullPath = join(EC2_DATA_DIR, relativePath)
  const content = readFileSync(fullPath, 'utf-8')
  return JSON.parse(content) as T
}

describe('EC2 Module', () => {
  beforeEach(() => {
    clearEC2Cache()
  })

  afterEach(() => {
    clearEC2Cache()
  })

  describe('getEC2Info', () => {
    it('should return info matching the JSON file', () => {
      const expected = loadJsonDirect<EC2Info>('info.json')
      const actual = getEC2Info()

      expect(actual).toEqual(expected)
    })

    it('should return arrays for families, instances, and categories', () => {
      const info = getEC2Info()

      expect(Array.isArray(info.families)).toBe(true)
      expect(Array.isArray(info.instances)).toBe(true)
      expect(Array.isArray(info.categories)).toBe(true)
      expect(info.families.length).toBeGreaterThan(0)
      expect(info.instances.length).toBeGreaterThan(0)
      expect(info.categories.length).toBeGreaterThan(0)
    })

    it('should cache the info and return the same object on subsequent calls', () => {
      const first = getEC2Info()
      const second = getEC2Info()

      expect(first).toBe(second)
    })
  })

  describe('getEC2InstanceInfo', () => {
    it('should return instance details matching the JSON file for m5.large', () => {
      const expected = loadJsonDirect<EC2InstanceDetails>(
        'instances/m5.large.json',
      )
      const actual = getEC2InstanceInfo('m5.large' as EC2InstanceType)

      expect(actual).toEqual(expected)
    })

    it('should return correct details for different instance types', () => {
      const info = getEC2Info()
      // Test a few different instance types
      const testInstances = info.instances.slice(0, 5)

      for (const instanceType of testInstances) {
        const expected = loadJsonDirect<EC2InstanceDetails>(
          `instances/${instanceType}.json`,
        )
        const actual = getEC2InstanceInfo(instanceType)

        expect(actual).toEqual(expected)
        expect(actual.instanceType).toBe(instanceType)
      }
    })

    it('should cache instance data', () => {
      getEC2InstanceInfo('m5.large' as EC2InstanceType)
      const stats = getEC2CacheStats()

      expect(stats.instances).toBe(1)
    })

    it('should return cached data on subsequent calls', () => {
      const first = getEC2InstanceInfo('m5.large' as EC2InstanceType)
      const second = getEC2InstanceInfo('m5.large' as EC2InstanceType)

      expect(first).toBe(second)
    })

    it('should include all expected properties', () => {
      const instance = getEC2InstanceInfo('m5.large' as EC2InstanceType)

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
    it('should return family data matching the JSON file for M5', () => {
      const expected = loadJsonDirect<EC2FamilyData>('families/M5.json')
      const actual = getEC2Family('M5' as EC2InstanceFamily)

      expect(actual).toEqual(expected)
    })

    it('should return correct data for different families', () => {
      const info = getEC2Info()
      // Test a few different families
      const testFamilies = info.families.slice(0, 5)

      for (const family of testFamilies) {
        const expected = loadJsonDirect<EC2FamilyData>(
          `families/${family}.json`,
        )
        const actual = getEC2Family(family)

        expect(actual).toEqual(expected)
        expect(actual.family).toBe(family)
      }
    })

    it('should cache family data', () => {
      getEC2Family('M5' as EC2InstanceFamily)
      const stats = getEC2CacheStats()

      expect(stats.families).toBe(1)
    })

    it('should return cached data on subsequent calls', () => {
      const first = getEC2Family('M5' as EC2InstanceFamily)
      const second = getEC2Family('M5' as EC2InstanceFamily)

      expect(first).toBe(second)
    })

    it('should include all expected properties', () => {
      const family = getEC2Family('M5' as EC2InstanceFamily)

      expect(family).toHaveProperty('family')
      expect(family).toHaveProperty('category')
      expect(family).toHaveProperty('instanceTypes')
      expect(family).toHaveProperty('hypervisor')
      expect(family).toHaveProperty('processorArchitecture')
      expect(Array.isArray(family.instanceTypes)).toBe(true)
    })
  })

  describe('getEC2FamilyInstanceTypes', () => {
    it('should return instance types matching the family JSON file', () => {
      const expected = loadJsonDirect<EC2FamilyData>('families/M5.json')
      const actual = getEC2FamilyInstanceTypes('M5' as EC2InstanceFamily)

      expect(actual).toEqual(expected.instanceTypes)
    })

    it('should return an array of instance types', () => {
      const types = getEC2FamilyInstanceTypes('M5' as EC2InstanceFamily)

      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)
      expect(types.every(t => t.toLowerCase().startsWith('m5.'))).toBe(true)
    })
  })

  describe('getEC2FamilyCategory', () => {
    it('should return category matching the family JSON file', () => {
      const expected = loadJsonDirect<EC2FamilyData>('families/M5.json')
      const actual = getEC2FamilyCategory('M5' as EC2InstanceFamily)

      expect(actual).toBe(expected.category)
    })

    it('should return correct categories for different family types', () => {
      // Test general purpose
      expect(getEC2FamilyCategory('M5' as EC2InstanceFamily)).toBe(
        'general_purpose',
      )

      // Test compute optimized
      expect(getEC2FamilyCategory('C5' as EC2InstanceFamily)).toBe(
        'compute_optimized',
      )

      // Test memory optimized
      expect(getEC2FamilyCategory('R5' as EC2InstanceFamily)).toBe(
        'memory_optimized',
      )
    })
  })

  describe('getAllEC2Families', () => {
    it('should return all families from the info JSON', () => {
      const expected = loadJsonDirect<EC2Info>('info.json')
      const actual = getAllEC2Families()

      expect(actual).toEqual(expected.families)
    })

    it('should return a non-empty array', () => {
      const families = getAllEC2Families()

      expect(Array.isArray(families)).toBe(true)
      expect(families.length).toBeGreaterThan(0)
    })
  })

  describe('getAllEC2InstanceTypes', () => {
    it('should return all instance types from the info JSON', () => {
      const expected = loadJsonDirect<EC2Info>('info.json')
      const actual = getAllEC2InstanceTypes()

      expect(actual).toEqual(expected.instances)
    })

    it('should return a non-empty array', () => {
      const types = getAllEC2InstanceTypes()

      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)
    })
  })

  describe('getAllEC2Categories', () => {
    it('should return all categories from the info JSON', () => {
      const expected = loadJsonDirect<EC2Info>('info.json')
      const actual = getAllEC2Categories()

      expect(actual).toEqual(expected.categories)
    })

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
      const info = loadJsonDirect<EC2Info>('info.json')

      for (const instanceType of info.instances.slice(0, 10)) {
        expect(isValidEC2InstanceType(instanceType)).toBe(true)
      }
    })

    it('should return false for invalid instance types', () => {
      expect(isValidEC2InstanceType('invalid.instance')).toBe(false)
      expect(isValidEC2InstanceType('m5.invalid')).toBe(false)
      expect(isValidEC2InstanceType('')).toBe(false)
      expect(isValidEC2InstanceType('random')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isValidEC2InstanceType('M5.large')).toBe(false) // Case sensitive
      expect(isValidEC2InstanceType('m5.large')).toBe(true)
    })
  })

  describe('isValidEC2Family', () => {
    it('should return true for valid families', () => {
      const info = loadJsonDirect<EC2Info>('info.json')

      for (const family of info.families.slice(0, 10)) {
        expect(isValidEC2Family(family)).toBe(true)
      }
    })

    it('should return false for invalid families', () => {
      expect(isValidEC2Family('Invalid')).toBe(false)
      expect(isValidEC2Family('')).toBe(false)
      expect(isValidEC2Family('m5')).toBe(false) // Case sensitive
      expect(isValidEC2Family('random')).toBe(false)
    })

    it('should handle case sensitivity', () => {
      expect(isValidEC2Family('M5')).toBe(true)
      expect(isValidEC2Family('m5')).toBe(false)
    })
  })

  describe('getEC2Instances', () => {
    it('should return a Map with correct instance data', () => {
      const testTypes = [
        'm5.large',
        'm5.xlarge',
        'c5.large',
      ] as EC2InstanceType[]
      const result = getEC2Instances(testTypes)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(3)

      for (const type of testTypes) {
        const expected = loadJsonDirect<EC2InstanceDetails>(
          `instances/${type}.json`,
        )
        expect(result.get(type)).toEqual(expected)
      }
    })

    it('should return an empty Map for an empty array', () => {
      const result = getEC2Instances([])

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })

    it('should cache all fetched instances', () => {
      const testTypes = ['m5.large', 'm5.xlarge'] as EC2InstanceType[]
      getEC2Instances(testTypes)
      const stats = getEC2CacheStats()

      expect(stats.instances).toBe(2)
    })
  })

  describe('getEC2Families', () => {
    it('should return a Map with correct family data', () => {
      const testFamilies = ['M5', 'C5', 'R5'] as EC2InstanceFamily[]
      const result = getEC2Families(testFamilies)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(3)

      for (const family of testFamilies) {
        const expected = loadJsonDirect<EC2FamilyData>(
          `families/${family}.json`,
        )
        expect(result.get(family)).toEqual(expected)
      }
    })

    it('should return an empty Map for an empty array', () => {
      const result = getEC2Families([])

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })

    it('should cache all fetched families', () => {
      const testFamilies = ['M5', 'C5'] as EC2InstanceFamily[]
      getEC2Families(testFamilies)
      const stats = getEC2CacheStats()

      expect(stats.families).toBe(2)
    })
  })

  describe('clearEC2Cache', () => {
    it('should clear all cached data', () => {
      // Populate cache
      getEC2Info()
      getEC2InstanceInfo('m5.large' as EC2InstanceType)
      getEC2Family('M5' as EC2InstanceFamily)

      let stats = getEC2CacheStats()
      expect(stats.instances).toBe(1)
      expect(stats.families).toBe(1)
      expect(stats.infoLoaded).toBe(true)

      // Clear cache
      clearEC2Cache()

      stats = getEC2CacheStats()
      expect(stats.instances).toBe(0)
      expect(stats.families).toBe(0)
      expect(stats.infoLoaded).toBe(false)
    })
  })

  describe('getEC2CacheStats', () => {
    it('should return correct stats for empty cache', () => {
      const stats = getEC2CacheStats()

      expect(stats).toEqual({
        instances: 0,
        families: 0,
        infoLoaded: false,
      })
    })

    it('should return correct stats after loading data', () => {
      getEC2Info()
      getEC2InstanceInfo('m5.large' as EC2InstanceType)
      getEC2InstanceInfo('m5.xlarge' as EC2InstanceType)
      getEC2Family('M5' as EC2InstanceFamily)

      const stats = getEC2CacheStats()

      expect(stats).toEqual({
        instances: 2,
        families: 1,
        infoLoaded: true,
      })
    })
  })

  describe('Data Integrity', () => {
    it('should have consistent data between instance and family files', () => {
      const info = getEC2Info()

      // Check a few families
      for (const familyName of info.families.slice(0, 5)) {
        const family = getEC2Family(familyName)

        // Each instance in the family should exist and have the correct family
        for (const instanceType of family.instanceTypes) {
          expect(info.instances).toContain(instanceType)

          const instance = getEC2InstanceInfo(instanceType)
          expect(instance.family).toBe(familyName)
          expect(instance.category).toBe(family.category)
        }
      }
    })

    it('should have valid categories for all families', () => {
      const info = getEC2Info()
      const validCategories = new Set(info.categories)

      for (const familyName of info.families.slice(0, 10)) {
        const category = getEC2FamilyCategory(familyName)
        expect(validCategories.has(category)).toBe(true)
      }
    })
  })
})
