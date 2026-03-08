import { LRUCache } from 'lru-cache'

import { RDS_FAMILY_CACHE_SIZE, RDS_INSTANCE_CACHE_SIZE } from './constants.js'
import {
  RDS_CATEGORIES,
  determineRDSCategory,
  extractRDSFamily,
  fetchRDSInstances,
} from './fetch.js'
import type { RDSFamilyData, RDSInfo, RDSInstanceDetails } from './types.js'

// === Inline Cache State ===

const instanceCache = new LRUCache<string, RDSInstanceDetails>({
  max: RDS_INSTANCE_CACHE_SIZE,
})

const familyCache = new LRUCache<string, RDSFamilyData>({
  max: RDS_FAMILY_CACHE_SIZE,
})

// Full dataset maps — held separately from LRU so entries are never evicted.
// The LRU is kept for API compatibility (getRDSCacheStats / clearRDSCache).
const instanceMap = new Map<string, RDSInstanceDetails>()
const familyMap = new Map<string, RDSFamilyData>()

let infoCacheValue: RDSInfo | null = null

let initialized = false
let initPromise: Promise<void> | null = null

/**
 * Trigger the lazy bulk fetch of all RDS instance data.
 * Subsequent calls are no-ops — data is served from LRU cache.
 */
async function ensureInitialized(): Promise<void> {
  if (initialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    const all = await fetchRDSInstances()

    // Populate instance cache and full map
    for (const instance of all) {
      instanceCache.set(instance.instanceClass, instance)
      instanceMap.set(instance.instanceClass, instance)
    }

    // Build family data from instances
    const builtFamilyMap = new Map<string, RDSFamilyData>()
    for (const instance of all) {
      const { family, category } = instance
      let fd = builtFamilyMap.get(family)
      if (!fd) {
        fd = { family, category, instanceClasses: [] }
        builtFamilyMap.set(family, fd)
      }
      fd.instanceClasses.push(instance.instanceClass)
    }
    for (const [family, fd] of builtFamilyMap) {
      familyCache.set(family, fd)
      familyMap.set(family, fd)
    }

    // Build info manifest
    const families = [...builtFamilyMap.keys()].sort()
    const instances = all.map(i => i.instanceClass).sort()
    const categories = RDS_CATEGORIES
    infoCacheValue = { families, instances, categories }

    initialized = true
  })()

  return initPromise
}

// === Cache Utilities ===

/**
 * Clear all RDS in-memory caches (instances, families, info manifest).
 * The next call to any RDS function will re-fetch all data from AWS docs.
 */
export function clearRDSCache(): void {
  instanceCache.clear()
  familyCache.clear()
  instanceMap.clear()
  familyMap.clear()
  infoCacheValue = null
  initialized = false
  initPromise = null
}

/**
 * Get current RDS LRU cache statistics.
 *
 * @returns Object with instance and family cache sizes
 */
export function getRDSCacheStats(): {
  instanceCacheSize: number
  familyCacheSize: number
} {
  return {
    instanceCacheSize: instanceCache.size,
    familyCacheSize: familyCache.size,
  }
}

// === Public API ===

/**
 * Get the RDS info manifest containing lists of all families and instance classes.
 * Triggers the initial bulk fetch on first call; subsequent calls use cache.
 *
 * @returns Promise resolving to RDSInfo object with families, instances, and categories arrays
 *
 * @example
 * ```typescript
 * import { getRDSInfo } from 'aws-instance-info/async'
 *
 * const info = await getRDSInfo()
 * console.log(info.families) // ['M5', 'R6g', 'T3', ...]
 * console.log(info.instances) // ['db.m5.large', 'db.r6g.xlarge', ...]
 * console.log(info.categories) // ['general_purpose', 'memory_optimized', ...]
 * ```
 */
export async function getRDSInfo(): Promise<RDSInfo> {
  await ensureInitialized()
  return infoCacheValue as RDSInfo
}

/**
 * Get detailed information for a specific RDS instance class.
 * Triggers the initial bulk fetch on first call; subsequent calls use LRU cache.
 *
 * @param instanceClass - The instance class (e.g., "db.m5.large")
 * @returns Promise resolving to instance class details including vCPUs, memory, network, and storage specs
 *
 * @example
 * ```typescript
 * import { getRDSInstanceInfo } from 'aws-instance-info/async'
 *
 * const instance = await getRDSInstanceInfo('db.m5.large')
 * console.log(instance.instanceClass) // 'db.m5.large'
 * console.log(instance.vCPUs) // 2
 * console.log(instance.memoryGiB) // 8
 * console.log(instance.networkBandwidthGbps) // 'Up to 10'
 * ```
 */
export async function getRDSInstanceInfo(
  instanceClass: string,
): Promise<RDSInstanceDetails> {
  await ensureInitialized()
  const cached = instanceMap.get(instanceClass)
  if (cached) return cached
  throw new Error(`Unknown RDS instance class: ${instanceClass}`)
}

/**
 * Get all data for an RDS instance family.
 * Includes the list of instance classes in the family. Results are served from LRU cache.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Promise resolving to family data including category and instance class list
 *
 * @example
 * ```typescript
 * import { getRDSFamily } from 'aws-instance-info/async'
 *
 * const family = await getRDSFamily('M5')
 * console.log(family.category) // 'general_purpose'
 * console.log(family.instanceClasses) // ['db.m5.large', 'db.m5.xlarge', ...]
 * ```
 */
export async function getRDSFamily(family: string): Promise<RDSFamilyData> {
  await ensureInitialized()
  const cached = familyMap.get(family)
  if (cached) return cached
  throw new Error(`Unknown RDS instance family: ${family}`)
}

/**
 * Get all instance classes belonging to a specific RDS family.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Promise resolving to array of instance class names in the family
 *
 * @example
 * ```typescript
 * import { getRDSFamilyInstanceClasses } from 'aws-instance-info/async'
 *
 * const classes = await getRDSFamilyInstanceClasses('M5')
 * console.log(classes) // ['db.m5.large', 'db.m5.xlarge', 'db.m5.2xlarge', ...]
 * ```
 */
export async function getRDSFamilyInstanceClasses(
  family: string,
): Promise<string[]> {
  const familyData = await getRDSFamily(family)
  return familyData.instanceClasses
}

/**
 * Get the category for an RDS instance family.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Promise resolving to the category (e.g., "general_purpose")
 *
 * @example
 * ```typescript
 * import { getRDSFamilyCategory } from 'aws-instance-info/async'
 *
 * const category = await getRDSFamilyCategory('M5')
 * console.log(category) // 'general_purpose'
 *
 * const category2 = await getRDSFamilyCategory('R6g')
 * console.log(category2) // 'memory_optimized'
 * ```
 */
export async function getRDSFamilyCategory(family: string): Promise<string> {
  const familyData = await getRDSFamily(family)
  return familyData.category
}

/**
 * Get all available RDS instance families.
 *
 * @returns Promise resolving to array of all family names
 *
 * @example
 * ```typescript
 * import { getAllRDSFamilies } from 'aws-instance-info/async'
 *
 * const families = await getAllRDSFamilies()
 * console.log(families) // ['M5', 'M6g', 'M6i', 'R6g', 'R6i', 'T3', 'T4g', ...]
 * console.log(families.length) // ~40
 * ```
 */
export async function getAllRDSFamilies(): Promise<string[]> {
  const info = await getRDSInfo()
  return info.families
}

/**
 * Get all available RDS instance classes.
 *
 * @returns Promise resolving to array of all instance class names
 *
 * @example
 * ```typescript
 * import { getAllRDSInstanceClasses } from 'aws-instance-info/async'
 *
 * const classes = await getAllRDSInstanceClasses()
 * console.log(classes) // ['db.m5.large', 'db.m5.xlarge', 'db.r6g.2xlarge', ...]
 * console.log(classes.length) // ~350
 * ```
 */
export async function getAllRDSInstanceClasses(): Promise<string[]> {
  const info = await getRDSInfo()
  return info.instances
}

/**
 * Get all available RDS categories.
 *
 * @returns Promise resolving to array of all category names
 *
 * @example
 * ```typescript
 * import { getAllRDSCategories } from 'aws-instance-info/async'
 *
 * const categories = await getAllRDSCategories()
 * console.log(categories)
 * // ['general_purpose', 'memory_optimized', 'compute_optimized', 'burstable_performance']
 * ```
 */
export async function getAllRDSCategories(): Promise<string[]> {
  const info = await getRDSInfo()
  return info.categories
}

/**
 * Check if an RDS instance class exists in the dataset.
 *
 * @param instanceClass - The instance class to check
 * @returns Promise resolving to true if the instance class exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidRDSInstanceClass } from 'aws-instance-info/async'
 *
 * console.log(await isValidRDSInstanceClass('db.m5.large')) // true
 * console.log(await isValidRDSInstanceClass('db.m5.invalid')) // false
 * console.log(await isValidRDSInstanceClass('db.t3.micro')) // true
 * ```
 */
export async function isValidRDSInstanceClass(
  instanceClass: string,
): Promise<boolean> {
  await ensureInitialized()
  return instanceMap.has(instanceClass)
}

/**
 * Check if an RDS instance family exists in the dataset.
 *
 * @param family - The family name to check
 * @returns Promise resolving to true if the family exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidRDSFamily } from 'aws-instance-info/async'
 *
 * console.log(await isValidRDSFamily('M5')) // true
 * console.log(await isValidRDSFamily('R6g')) // true
 * console.log(await isValidRDSFamily('Invalid')) // false
 * ```
 */
export async function isValidRDSFamily(family: string): Promise<boolean> {
  await ensureInitialized()
  return familyMap.has(family)
}

/**
 * Get multiple RDS instance classes at once.
 *
 * @param instanceClasses - Array of instance classes to fetch
 * @returns Promise resolving to Map of instance class to details
 *
 * @example
 * ```typescript
 * import { getRDSInstances } from 'aws-instance-info/async'
 *
 * const instances = await getRDSInstances(['db.m5.large', 'db.m5.xlarge', 'db.r6g.2xlarge'])
 *
 * for (const [cls, details] of instances) {
 *   console.log(`${cls}: ${details.vCPUs} vCPUs, ${details.memoryGiB} GiB`)
 * }
 * // db.m5.large: 2 vCPUs, 8 GiB
 * // db.m5.xlarge: 4 vCPUs, 16 GiB
 * // db.r6g.2xlarge: 8 vCPUs, 64 GiB
 * ```
 */
export async function getRDSInstances(
  instanceClasses: string[],
): Promise<Map<string, RDSInstanceDetails>> {
  const results = await Promise.all(
    instanceClasses.map(async instanceClass => {
      const details = await getRDSInstanceInfo(instanceClass)
      return [instanceClass, details] as const
    }),
  )
  return new Map(results)
}

/**
 * Get multiple RDS families at once.
 *
 * @param families - Array of family names to fetch
 * @returns Promise resolving to Map of family name to family data
 *
 * @example
 * ```typescript
 * import { getRDSFamilies } from 'aws-instance-info/async'
 *
 * const families = await getRDSFamilies(['M5', 'R6g', 'T3'])
 *
 * for (const [name, data] of families) {
 *   console.log(`${name}: ${data.category}, ${data.instanceClasses.length} classes`)
 * }
 * // M5: general_purpose, 12 classes
 * // R6g: memory_optimized, 11 classes
 * // T3: burstable_performance, 8 classes
 * ```
 */
export async function getRDSFamilies(
  families: string[],
): Promise<Map<string, RDSFamilyData>> {
  const results = await Promise.all(
    families.map(async family => {
      const data = await getRDSFamily(family)
      return [family, data] as const
    }),
  )
  return new Map(results)
}

// Re-export for convenience
export { determineRDSCategory, extractRDSFamily }
