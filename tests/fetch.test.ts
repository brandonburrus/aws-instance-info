import { describe, expect, it } from 'vitest'

import {
  EC2_CATEGORIES,
  ELASTICACHE_CATEGORIES,
  ELASTICACHE_URL,
  RDS_CATEGORIES,
  RDS_URL,
  determineElastiCacheCategory,
  determineRDSCategory,
  extractElastiCacheFamily,
  extractFamilyFromInstanceType,
  extractRDSFamily,
  fetchAllEC2,
  fetchEC2Category,
  fetchElastiCacheNodes,
  fetchRDSInstances,
} from '../lib/fetch.js'

// MSW is set up in tests/setup.ts via vitest setupFiles — all 8 URLs are intercepted

describe('fetch.ts', () => {
  // === URL / Category constants ===

  describe('EC2_CATEGORIES', () => {
    it('should define all 6 EC2 categories with URLs', () => {
      expect(Object.keys(EC2_CATEGORIES)).toHaveLength(6)
      expect(EC2_CATEGORIES).toHaveProperty('general_purpose')
      expect(EC2_CATEGORIES).toHaveProperty('compute_optimized')
      expect(EC2_CATEGORIES).toHaveProperty('memory_optimized')
      expect(EC2_CATEGORIES).toHaveProperty('storage_optimized')
      expect(EC2_CATEGORIES).toHaveProperty('accelerated_computing')
      expect(EC2_CATEGORIES).toHaveProperty('hpc')
    })

    it('should have valid HTTPS URLs for all categories', () => {
      for (const url of Object.values(EC2_CATEGORIES)) {
        expect(url).toMatch(/^https:\/\/docs\.aws\.amazon\.com/)
      }
    })
  })

  describe('RDS_URL', () => {
    it('should be a valid AWS docs HTTPS URL', () => {
      expect(RDS_URL).toMatch(/^https:\/\/docs\.aws\.amazon\.com/)
    })
  })

  describe('ELASTICACHE_URL', () => {
    it('should be a valid AWS docs HTTPS URL', () => {
      expect(ELASTICACHE_URL).toMatch(/^https:\/\/docs\.aws\.amazon\.com/)
    })
  })

  describe('RDS_CATEGORIES', () => {
    it('should include all 4 RDS categories', () => {
      expect(RDS_CATEGORIES).toContain('general_purpose')
      expect(RDS_CATEGORIES).toContain('memory_optimized')
      expect(RDS_CATEGORIES).toContain('compute_optimized')
      expect(RDS_CATEGORIES).toContain('burstable_performance')
    })
  })

  describe('ELASTICACHE_CATEGORIES', () => {
    it('should include all 4 ElastiCache categories', () => {
      expect(ELASTICACHE_CATEGORIES).toContain('general_purpose')
      expect(ELASTICACHE_CATEGORIES).toContain('memory_optimized')
      expect(ELASTICACHE_CATEGORIES).toContain('network_optimized')
      expect(ELASTICACHE_CATEGORIES).toContain('burstable_performance')
    })
  })

  // === Family extraction helpers ===

  describe('extractFamilyFromInstanceType', () => {
    it('should extract family from standard EC2 instance types', () => {
      expect(extractFamilyFromInstanceType('m5.large')).toBe('M5')
      expect(extractFamilyFromInstanceType('c5.xlarge')).toBe('C5')
      expect(extractFamilyFromInstanceType('r5.2xlarge')).toBe('R5')
      expect(extractFamilyFromInstanceType('hpc6a.48xlarge')).toBe('Hpc6a')
      expect(extractFamilyFromInstanceType('p3.2xlarge')).toBe('P3')
    })

    it('should capitalize the first letter', () => {
      expect(extractFamilyFromInstanceType('t3.micro')).toBe('T3')
      expect(extractFamilyFromInstanceType('i3.large')).toBe('I3')
    })
  })

  describe('extractRDSFamily', () => {
    it('should extract family from db. prefixed instance classes', () => {
      expect(extractRDSFamily('db.m5.large')).toBe('M5')
      expect(extractRDSFamily('db.r5.xlarge')).toBe('R5')
      expect(extractRDSFamily('db.t3.micro')).toBe('T3')
    })

    it('should return unchanged string if no db. prefix', () => {
      expect(extractRDSFamily('m5.large')).toBe('m5.large')
    })
  })

  describe('extractElastiCacheFamily', () => {
    it('should extract family from cache. prefixed node types', () => {
      expect(extractElastiCacheFamily('cache.m5.large')).toBe('M5')
      expect(extractElastiCacheFamily('cache.r5.xlarge')).toBe('R5')
      expect(extractElastiCacheFamily('cache.t3.micro')).toBe('T3')
    })

    it('should return unchanged string if no cache. prefix', () => {
      expect(extractElastiCacheFamily('m5.large')).toBe('m5.large')
    })
  })

  // === Category determination helpers ===

  describe('determineRDSCategory', () => {
    it('should return burstable_performance for T families', () => {
      expect(determineRDSCategory('T3')).toBe('burstable_performance')
      expect(determineRDSCategory('T4g')).toBe('burstable_performance')
    })

    it('should return memory_optimized for R, X, Z families', () => {
      expect(determineRDSCategory('R5')).toBe('memory_optimized')
      expect(determineRDSCategory('R6g')).toBe('memory_optimized')
      expect(determineRDSCategory('X2g')).toBe('memory_optimized')
      expect(determineRDSCategory('Z1d')).toBe('memory_optimized')
    })

    it('should return compute_optimized for C families', () => {
      expect(determineRDSCategory('C5')).toBe('compute_optimized')
    })

    it('should return general_purpose for M families', () => {
      expect(determineRDSCategory('M5')).toBe('general_purpose')
      expect(determineRDSCategory('M6g')).toBe('general_purpose')
    })
  })

  describe('determineElastiCacheCategory', () => {
    it('should return burstable_performance for T families', () => {
      expect(determineElastiCacheCategory('T3')).toBe('burstable_performance')
      expect(determineElastiCacheCategory('T4g')).toBe('burstable_performance')
    })

    it('should return memory_optimized for R families', () => {
      expect(determineElastiCacheCategory('R5')).toBe('memory_optimized')
      expect(determineElastiCacheCategory('R6g')).toBe('memory_optimized')
    })

    it('should return network_optimized for C families', () => {
      expect(determineElastiCacheCategory('C7gn')).toBe('network_optimized')
    })

    it('should return general_purpose for M families', () => {
      expect(determineElastiCacheCategory('M5')).toBe('general_purpose')
      expect(determineElastiCacheCategory('M6g')).toBe('general_purpose')
    })
  })

  // === Fetch functions (MSW-intercepted) ===

  describe('fetchEC2Category', () => {
    it('should return EC2 instances for general_purpose category', async () => {
      const instances = await fetchEC2Category(
        'general_purpose',
        EC2_CATEGORIES.general_purpose ?? '',
      )
      expect(Array.isArray(instances)).toBe(true)
      expect(instances.length).toBeGreaterThan(0)

      const m5large = instances.find(i => i.instanceType === 'm5.large')
      expect(m5large).toBeDefined()
      expect(m5large?.category).toBe('general_purpose')
      expect(m5large?.family).toBe('M5')
      expect(m5large?.vCPUs).toBe(2)
      expect(m5large?.memoryGiB).toBe(8)
    })

    it('should return EC2 instances for compute_optimized category', async () => {
      const instances = await fetchEC2Category(
        'compute_optimized',
        EC2_CATEGORIES.compute_optimized ?? '',
      )
      expect(instances.length).toBeGreaterThan(0)
      const c5large = instances.find(i => i.instanceType === 'c5.large')
      expect(c5large?.category).toBe('compute_optimized')
    })

    it('should return EC2 instances for memory_optimized category', async () => {
      const instances = await fetchEC2Category(
        'memory_optimized',
        EC2_CATEGORIES.memory_optimized ?? '',
      )
      expect(instances.length).toBeGreaterThan(0)
      const r5large = instances.find(i => i.instanceType === 'r5.large')
      expect(r5large?.category).toBe('memory_optimized')
    })

    it('each instance should have required properties', async () => {
      const instances = await fetchEC2Category(
        'general_purpose',
        EC2_CATEGORIES.general_purpose ?? '',
      )
      for (const inst of instances) {
        expect(inst).toHaveProperty('instanceType')
        expect(inst).toHaveProperty('family')
        expect(inst).toHaveProperty('category')
        expect(inst).toHaveProperty('vCPUs')
        expect(inst).toHaveProperty('memoryGiB')
        expect(inst).toHaveProperty('network')
        expect(inst).toHaveProperty('ebs')
        expect(inst).toHaveProperty('security')
      }
    })
  })

  describe('fetchAllEC2', () => {
    it('should return instances from all 6 categories', async () => {
      const instances = await fetchAllEC2()
      expect(Array.isArray(instances)).toBe(true)
      expect(instances.length).toBeGreaterThan(0)

      const categories = new Set(instances.map(i => i.category))
      expect(categories.has('general_purpose')).toBe(true)
      expect(categories.has('compute_optimized')).toBe(true)
      expect(categories.has('memory_optimized')).toBe(true)
      expect(categories.has('storage_optimized')).toBe(true)
      expect(categories.has('accelerated_computing')).toBe(true)
      expect(categories.has('hpc')).toBe(true)
    })

    it('should include instances from all fixture families', async () => {
      const instances = await fetchAllEC2()
      const types = instances.map(i => i.instanceType)
      expect(types).toContain('m5.large')
      expect(types).toContain('c5.large')
      expect(types).toContain('r5.large')
      expect(types).toContain('i3.large')
      expect(types).toContain('p3.2xlarge')
      expect(types).toContain('hpc6a.48xlarge')
    })
  })

  describe('fetchRDSInstances', () => {
    it('should return RDS instances from MSW fixture', async () => {
      const instances = await fetchRDSInstances()
      expect(Array.isArray(instances)).toBe(true)
      expect(instances.length).toBeGreaterThan(0)
    })

    it('should include expected instances from fixture', async () => {
      const instances = await fetchRDSInstances()
      const classes = instances.map(i => i.instanceClass)
      expect(classes).toContain('db.m5.large')
      expect(classes).toContain('db.r5.large')
      expect(classes).toContain('db.t3.micro')
    })

    it('should have correct family and category for db.m5.large', async () => {
      const instances = await fetchRDSInstances()
      const m5large = instances.find(i => i.instanceClass === 'db.m5.large')
      expect(m5large?.family).toBe('M5')
      expect(m5large?.category).toBe('general_purpose')
      expect(m5large?.vCPUs).toBe(2)
      expect(m5large?.memoryGiB).toBe(8)
    })

    it('should have correct family and category for db.r5.large', async () => {
      const instances = await fetchRDSInstances()
      const r5large = instances.find(i => i.instanceClass === 'db.r5.large')
      expect(r5large?.family).toBe('R5')
      expect(r5large?.category).toBe('memory_optimized')
    })

    it('should have correct family and category for db.t3.micro', async () => {
      const instances = await fetchRDSInstances()
      const t3micro = instances.find(i => i.instanceClass === 'db.t3.micro')
      expect(t3micro?.family).toBe('T3')
      expect(t3micro?.category).toBe('burstable_performance')
    })

    it('each instance should have required properties', async () => {
      const instances = await fetchRDSInstances()
      for (const inst of instances) {
        expect(inst).toHaveProperty('instanceClass')
        expect(inst).toHaveProperty('family')
        expect(inst).toHaveProperty('category')
        expect(inst).toHaveProperty('vCPUs')
        expect(inst).toHaveProperty('memoryGiB')
        expect(inst).toHaveProperty('networkBandwidthGbps')
        expect(inst).toHaveProperty('ebsBandwidthMbps')
        // All instance classes should start with db.
        expect(inst.instanceClass.startsWith('db.')).toBe(true)
      }
    })
  })

  describe('fetchElastiCacheNodes', () => {
    it('should return ElastiCache nodes from MSW fixture', async () => {
      const nodes = await fetchElastiCacheNodes()
      expect(Array.isArray(nodes)).toBe(true)
      expect(nodes.length).toBeGreaterThan(0)
    })

    it('should include expected nodes from fixture', async () => {
      const nodes = await fetchElastiCacheNodes()
      const types = nodes.map(n => n.nodeType)
      expect(types).toContain('cache.m5.large')
      expect(types).toContain('cache.r5.large')
      expect(types).toContain('cache.t3.micro')
    })

    it('should have correct family and category for cache.m5.large', async () => {
      const nodes = await fetchElastiCacheNodes()
      const m5large = nodes.find(n => n.nodeType === 'cache.m5.large')
      expect(m5large?.family).toBe('M5')
      expect(m5large?.category).toBe('general_purpose')
      expect(m5large?.vCPUs).toBe(2)
      expect(m5large?.memoryGiB).toBe(6.38)
    })

    it('should have correct family and category for cache.r5.large', async () => {
      const nodes = await fetchElastiCacheNodes()
      const r5large = nodes.find(n => n.nodeType === 'cache.r5.large')
      expect(r5large?.family).toBe('R5')
      expect(r5large?.category).toBe('memory_optimized')
    })

    it('should have correct family and category for cache.t3.micro', async () => {
      const nodes = await fetchElastiCacheNodes()
      const t3micro = nodes.find(n => n.nodeType === 'cache.t3.micro')
      expect(t3micro?.family).toBe('T3')
      expect(t3micro?.category).toBe('burstable_performance')
    })

    it('each node should have required properties', async () => {
      const nodes = await fetchElastiCacheNodes()
      for (const node of nodes) {
        expect(node).toHaveProperty('nodeType')
        expect(node).toHaveProperty('family')
        expect(node).toHaveProperty('category')
        expect(node).toHaveProperty('vCPUs')
        expect(node).toHaveProperty('memoryGiB')
        expect(node).toHaveProperty('networkPerformance')
        expect(node).toHaveProperty('baselineBandwidthGbps')
        expect(node).toHaveProperty('burstBandwidthGbps')
        // All node types should start with cache.
        expect(node.nodeType.startsWith('cache.')).toBe(true)
      }
    })

    it('should not have duplicate node types', async () => {
      const nodes = await fetchElastiCacheNodes()
      const types = nodes.map(n => n.nodeType)
      const unique = new Set(types)
      expect(unique.size).toBe(types.length)
    })
  })
})
