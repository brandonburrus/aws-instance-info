import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  getAllEC2Categories,
  getAllEC2Families,
  getAllEC2InstanceTypes,
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
import { clearEC2Cache, getEC2CacheStats } from '../lib/ec2.cache.js'
import type {
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

describe('EC2 Async Module', () => {
  beforeEach(() => {
    clearEC2Cache()
  })

  afterEach(() => {
    clearEC2Cache()
  })

  describe('getEC2Info', () => {
    it('should return info matching the JSON file', async () => {
      const expected = loadJsonDirect<EC2Info>('info.json')
      const actual = await getEC2Info()

      expect(actual).toEqual(expected)
    })

    it('should return arrays for families, instances, and categories', async () => {
      const info = await getEC2Info()

      expect(Array.isArray(info.families)).toBe(true)
      expect(Array.isArray(info.instances)).toBe(true)
      expect(Array.isArray(info.categories)).toBe(true)
    })

    it('should cache the info and return the same object on subsequent calls', async () => {
      const first = await getEC2Info()
      const second = await getEC2Info()

      expect(first).toBe(second)
    })
  })

  describe('getEC2InstanceInfo', () => {
    it('should return instance details matching the JSON file', async () => {
      const expected = loadJsonDirect<EC2InstanceDetails>(
        'instances/m5.large.json',
      )
      const actual = await getEC2InstanceInfo('m5.large' as EC2InstanceType)

      expect(actual).toEqual(expected)
    })

    it('should cache instance data', async () => {
      await getEC2InstanceInfo('m5.large' as EC2InstanceType)
      const stats = getEC2CacheStats()

      expect(stats.instances).toBe(1)
    })

    it('should return cached data on subsequent calls', async () => {
      const first = await getEC2InstanceInfo('m5.large' as EC2InstanceType)
      const second = await getEC2InstanceInfo('m5.large' as EC2InstanceType)

      expect(first).toBe(second)
    })
  })

  describe('getEC2Family', () => {
    it('should return family data matching the JSON file', async () => {
      const expected = loadJsonDirect<EC2FamilyData>('families/M5.json')
      const actual = await getEC2Family('M5' as EC2InstanceFamily)

      expect(actual).toEqual(expected)
    })

    it('should cache family data', async () => {
      await getEC2Family('M5' as EC2InstanceFamily)
      const stats = getEC2CacheStats()

      expect(stats.families).toBe(1)
    })

    it('should return cached data on subsequent calls', async () => {
      const first = await getEC2Family('M5' as EC2InstanceFamily)
      const second = await getEC2Family('M5' as EC2InstanceFamily)

      expect(first).toBe(second)
    })
  })

  describe('getEC2FamilyInstanceTypes', () => {
    it('should return instance types matching the family JSON file', async () => {
      const expected = loadJsonDirect<EC2FamilyData>('families/M5.json')
      const actual = await getEC2FamilyInstanceTypes('M5' as EC2InstanceFamily)

      expect(actual).toEqual(expected.instanceTypes)
    })
  })

  describe('getEC2FamilyCategory', () => {
    it('should return category matching the family JSON file', async () => {
      const expected = loadJsonDirect<EC2FamilyData>('families/M5.json')
      const actual = await getEC2FamilyCategory('M5' as EC2InstanceFamily)

      expect(actual).toBe(expected.category)
    })
  })

  describe('getAllEC2Families', () => {
    it('should return all families from the info JSON', async () => {
      const expected = loadJsonDirect<EC2Info>('info.json')
      const actual = await getAllEC2Families()

      expect(actual).toEqual(expected.families)
    })
  })

  describe('getAllEC2InstanceTypes', () => {
    it('should return all instance types from the info JSON', async () => {
      const expected = loadJsonDirect<EC2Info>('info.json')
      const actual = await getAllEC2InstanceTypes()

      expect(actual).toEqual(expected.instances)
    })
  })

  describe('getAllEC2Categories', () => {
    it('should return all categories from the info JSON', async () => {
      const expected = loadJsonDirect<EC2Info>('info.json')
      const actual = await getAllEC2Categories()

      expect(actual).toEqual(expected.categories)
    })
  })

  describe('isValidEC2InstanceType', () => {
    it('should return true for valid instance types', async () => {
      expect(await isValidEC2InstanceType('m5.large')).toBe(true)
    })

    it('should return false for invalid instance types', async () => {
      expect(await isValidEC2InstanceType('invalid.instance')).toBe(false)
    })
  })

  describe('isValidEC2Family', () => {
    it('should return true for valid families', async () => {
      expect(await isValidEC2Family('M5')).toBe(true)
    })

    it('should return false for invalid families', async () => {
      expect(await isValidEC2Family('Invalid')).toBe(false)
    })
  })

  describe('getEC2Instances', () => {
    it('should return a Map with correct instance data', async () => {
      const testTypes = ['m5.large', 'm5.xlarge'] as EC2InstanceType[]
      const result = await getEC2Instances(testTypes)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(2)

      for (const type of testTypes) {
        const expected = loadJsonDirect<EC2InstanceDetails>(
          `instances/${type}.json`,
        )
        expect(result.get(type)).toEqual(expected)
      }
    })

    it('should return an empty Map for an empty array', async () => {
      const result = await getEC2Instances([])

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('getEC2Families', () => {
    it('should return a Map with correct family data', async () => {
      const testFamilies = ['M5', 'C5'] as EC2InstanceFamily[]
      const result = await getEC2Families(testFamilies)

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(2)

      for (const family of testFamilies) {
        const expected = loadJsonDirect<EC2FamilyData>(
          `families/${family}.json`,
        )
        expect(result.get(family)).toEqual(expected)
      }
    })

    it('should return an empty Map for an empty array', async () => {
      const result = await getEC2Families([])

      expect(result instanceof Map).toBe(true)
      expect(result.size).toBe(0)
    })
  })

  describe('Re-exported cache utilities', () => {
    it('should re-export clearEC2Cache', async () => {
      const { clearEC2Cache: reExported } = await import('../lib/ec2.async.js')
      expect(typeof reExported).toBe('function')
    })

    it('should re-export getEC2CacheStats', async () => {
      const { getEC2CacheStats: reExported } = await import(
        '../lib/ec2.async.js'
      )
      expect(typeof reExported).toBe('function')
    })
  })
})
