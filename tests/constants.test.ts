import { describe, expect, it } from 'vitest'

import {
  EC2_FAMILY_CACHE_SIZE,
  EC2_INSTANCE_CACHE_SIZE,
  ELASTICACHE_FAMILY_CACHE_SIZE,
  ELASTICACHE_NODE_CACHE_SIZE,
  RDS_FAMILY_CACHE_SIZE,
  RDS_INSTANCE_CACHE_SIZE,
} from '../lib/constants.js'

describe('Constants Module', () => {
  describe('EC2 Cache Size Constants', () => {
    it('EC2_INSTANCE_CACHE_SIZE should be a positive number', () => {
      expect(typeof EC2_INSTANCE_CACHE_SIZE).toBe('number')
      expect(EC2_INSTANCE_CACHE_SIZE).toBeGreaterThan(0)
      expect(Number.isInteger(EC2_INSTANCE_CACHE_SIZE)).toBe(true)
    })

    it('EC2_INSTANCE_CACHE_SIZE should default to 512', () => {
      // Default value when env var is not set
      expect(EC2_INSTANCE_CACHE_SIZE).toBe(512)
    })

    it('EC2_FAMILY_CACHE_SIZE should be a positive number', () => {
      expect(typeof EC2_FAMILY_CACHE_SIZE).toBe('number')
      expect(EC2_FAMILY_CACHE_SIZE).toBeGreaterThan(0)
      expect(Number.isInteger(EC2_FAMILY_CACHE_SIZE)).toBe(true)
    })

    it('EC2_FAMILY_CACHE_SIZE should default to 256', () => {
      // Default value when env var is not set
      expect(EC2_FAMILY_CACHE_SIZE).toBe(256)
    })
  })

  describe('RDS Cache Size Constants', () => {
    it('RDS_INSTANCE_CACHE_SIZE should be a positive number', () => {
      expect(typeof RDS_INSTANCE_CACHE_SIZE).toBe('number')
      expect(RDS_INSTANCE_CACHE_SIZE).toBeGreaterThan(0)
      expect(Number.isInteger(RDS_INSTANCE_CACHE_SIZE)).toBe(true)
    })

    it('RDS_INSTANCE_CACHE_SIZE should default to 512', () => {
      // Default value when env var is not set
      expect(RDS_INSTANCE_CACHE_SIZE).toBe(512)
    })

    it('RDS_FAMILY_CACHE_SIZE should be a positive number', () => {
      expect(typeof RDS_FAMILY_CACHE_SIZE).toBe('number')
      expect(RDS_FAMILY_CACHE_SIZE).toBeGreaterThan(0)
      expect(Number.isInteger(RDS_FAMILY_CACHE_SIZE)).toBe(true)
    })

    it('RDS_FAMILY_CACHE_SIZE should default to 256', () => {
      // Default value when env var is not set
      expect(RDS_FAMILY_CACHE_SIZE).toBe(256)
    })
  })

  describe('ElastiCache Cache Size Constants', () => {
    it('ELASTICACHE_NODE_CACHE_SIZE should be a positive number', () => {
      expect(typeof ELASTICACHE_NODE_CACHE_SIZE).toBe('number')
      expect(ELASTICACHE_NODE_CACHE_SIZE).toBeGreaterThan(0)
      expect(Number.isInteger(ELASTICACHE_NODE_CACHE_SIZE)).toBe(true)
    })

    it('ELASTICACHE_NODE_CACHE_SIZE should default to 512', () => {
      // Default value when env var is not set
      expect(ELASTICACHE_NODE_CACHE_SIZE).toBe(512)
    })

    it('ELASTICACHE_FAMILY_CACHE_SIZE should be a positive number', () => {
      expect(typeof ELASTICACHE_FAMILY_CACHE_SIZE).toBe('number')
      expect(ELASTICACHE_FAMILY_CACHE_SIZE).toBeGreaterThan(0)
      expect(Number.isInteger(ELASTICACHE_FAMILY_CACHE_SIZE)).toBe(true)
    })

    it('ELASTICACHE_FAMILY_CACHE_SIZE should default to 256', () => {
      // Default value when env var is not set
      expect(ELASTICACHE_FAMILY_CACHE_SIZE).toBe(256)
    })
  })

  describe('Cache Size Relationships', () => {
    it('instance/node cache sizes should be larger than family cache sizes', () => {
      expect(EC2_INSTANCE_CACHE_SIZE).toBeGreaterThanOrEqual(
        EC2_FAMILY_CACHE_SIZE,
      )
      expect(RDS_INSTANCE_CACHE_SIZE).toBeGreaterThanOrEqual(
        RDS_FAMILY_CACHE_SIZE,
      )
      expect(ELASTICACHE_NODE_CACHE_SIZE).toBeGreaterThanOrEqual(
        ELASTICACHE_FAMILY_CACHE_SIZE,
      )
    })

    it('all instance/node cache sizes should have the same default', () => {
      expect(EC2_INSTANCE_CACHE_SIZE).toBe(RDS_INSTANCE_CACHE_SIZE)
      expect(RDS_INSTANCE_CACHE_SIZE).toBe(ELASTICACHE_NODE_CACHE_SIZE)
    })

    it('all family cache sizes should have the same default', () => {
      expect(EC2_FAMILY_CACHE_SIZE).toBe(RDS_FAMILY_CACHE_SIZE)
      expect(RDS_FAMILY_CACHE_SIZE).toBe(ELASTICACHE_FAMILY_CACHE_SIZE)
    })
  })
})
