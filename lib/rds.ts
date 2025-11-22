import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LRUCache } from 'lru-cache'

import { RDS_FAMILY_CACHE_SIZE, RDS_INSTANCE_CACHE_SIZE } from './constants.js'
import type {
  RDSCategory,
  RDSFamilyData,
  RDSInfo,
  RDSInstanceClass,
  RDSInstanceDetails,
  RDSInstanceFamily,
} from './types.js'

/* File Paths */
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_DIR = join(__dirname, '..', 'data', 'rds')

/* Internal Caches */
const instanceCache = new LRUCache<string, RDSInstanceDetails>({
  max: RDS_INSTANCE_CACHE_SIZE,
})
const familyCache = new LRUCache<string, RDSFamilyData>({
  max: RDS_FAMILY_CACHE_SIZE,
})
let infoCache: RDSInfo | null = null

/* Internal helper function to load and parse JSON files */
function loadJson<T>(relativePath: string): T {
  const fullPath = join(DATA_DIR, relativePath)
  const content = readFileSync(fullPath, 'utf-8')
  return JSON.parse(content) as T
}

/**
 * Get the RDS info manifest containing lists of all families and instance classes.
 * This is a lightweight file that can be used to enumerate available data.
 *
 * @returns RDSInfo object with families, instances, and categories arrays
 *
 * @example
 * ```typescript
 * import { getRDSInfo } from 'aws-instance-info'
 *
 * const info = getRDSInfo()
 * console.log(info.families) // ['M5', 'R6g', 'T3', ...]
 * console.log(info.instances) // ['db.m5.large', 'db.r6g.xlarge', ...]
 * console.log(info.categories) // ['general_purpose', 'memory_optimized', ...]
 * ```
 */
export function getRDSInfo(): RDSInfo {
  if (infoCache) {
    return infoCache
  }

  infoCache = loadJson<RDSInfo>('info.json')
  return infoCache
}

/**
 * Get detailed information for a specific RDS instance class.
 * Loads only the JSON file for the requested instance class. Results are cached using LRU.
 *
 * @param instanceClass - The instance class (e.g., "db.m5.large")
 * @returns Instance class details including vCPUs, memory, network, and storage specs
 *
 * @example
 * ```typescript
 * import { getRDSInstanceInfo } from 'aws-instance-info'
 *
 * const instance = getRDSInstanceInfo('db.m5.large')
 * console.log(instance.instanceClass) // 'db.m5.large'
 * console.log(instance.vCPUs) // 2
 * console.log(instance.memoryGiB) // 8
 * console.log(instance.networkPerformanceGbps) // 10
 * ```
 */
export function getRDSInstanceInfo(
  instanceClass: RDSInstanceClass,
): RDSInstanceDetails {
  const cached = instanceCache.get(instanceClass)
  if (cached) {
    return cached
  }

  const data = loadJson<RDSInstanceDetails>(`instances/${instanceClass}.json`)
  instanceCache.set(instanceClass, data)
  return data
}

/**
 * Get all data for an RDS instance family.
 * Includes specifications for all instance classes in the family. Results are cached using LRU.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Family data including all instance class specifications
 *
 * @example
 * ```typescript
 * import { getRDSFamily } from 'aws-instance-info'
 *
 * const family = getRDSFamily('M5')
 * console.log(family.category) // 'general_purpose'
 * console.log(family.instanceClasses) // ['db.m5.large', 'db.m5.xlarge', ...]
 * console.log(family.instances['db.m5.large'].vCPUs) // 2
 * console.log(family.instances['db.m5.large'].memoryGiB) // 8
 * ```
 */
export function getRDSFamily(family: RDSInstanceFamily): RDSFamilyData {
  const cached = familyCache.get(family)
  if (cached) {
    return cached
  }

  const data = loadJson<RDSFamilyData>(`families/${family}.json`)
  familyCache.set(family, data)
  return data
}

/**
 * Get all instance classes belonging to a specific RDS family.
 * This loads the family file but only returns the list of instance classes.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Array of instance class names in the family
 *
 * @example
 * ```typescript
 * import { getRDSFamilyInstanceClasses } from 'aws-instance-info'
 *
 * const classes = getRDSFamilyInstanceClasses('M5')
 * console.log(classes) // ['db.m5.large', 'db.m5.xlarge', 'db.m5.2xlarge', ...]
 * ```
 */
export function getRDSFamilyInstanceClasses(
  family: RDSInstanceFamily,
): RDSInstanceClass[] {
  const familyData = getRDSFamily(family)
  return familyData.instanceClasses
}

/**
 * Get the category for an RDS instance family.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns The category (e.g., "general_purpose")
 *
 * @example
 * ```typescript
 * import { getRDSFamilyCategory } from 'aws-instance-info'
 *
 * const category = getRDSFamilyCategory('M5')
 * console.log(category) // 'general_purpose'
 *
 * const category2 = getRDSFamilyCategory('R6g')
 * console.log(category2) // 'memory_optimized'
 * ```
 */
export function getRDSFamilyCategory(family: RDSInstanceFamily): RDSCategory {
  const familyData = getRDSFamily(family)
  return familyData.category
}

/**
 * Get all available RDS instance families.
 *
 * @returns Array of all family names
 *
 * @example
 * ```typescript
 * import { getAllRDSFamilies } from 'aws-instance-info'
 *
 * const families = getAllRDSFamilies()
 * console.log(families) // ['M5', 'M6g', 'M6i', 'R6g', 'R6i', 'T3', 'T4g', ...]
 * console.log(families.length) // ~40
 * ```
 */
export function getAllRDSFamilies(): RDSInstanceFamily[] {
  const info = getRDSInfo()
  return info.families
}

/**
 * Get all available RDS instance classes.
 *
 * @returns Array of all instance class names
 *
 * @example
 * ```typescript
 * import { getAllRDSInstanceClasses } from 'aws-instance-info'
 *
 * const classes = getAllRDSInstanceClasses()
 * console.log(classes) // ['db.m5.large', 'db.m5.xlarge', 'db.r6g.2xlarge', ...]
 * console.log(classes.length) // ~350
 * ```
 */
export function getAllRDSInstanceClasses(): RDSInstanceClass[] {
  const info = getRDSInfo()
  return info.instances
}

/**
 * Get all available RDS categories.
 *
 * @returns Array of all category names
 *
 * @example
 * ```typescript
 * import { getAllRDSCategories } from 'aws-instance-info'
 *
 * const categories = getAllRDSCategories()
 * console.log(categories)
 * // ['general_purpose', 'memory_optimized', 'compute_optimized', 'burstable_performance']
 * ```
 */
export function getAllRDSCategories(): RDSCategory[] {
  const info = getRDSInfo()
  return info.categories
}

/**
 * Check if an RDS instance class exists in the dataset.
 *
 * @param instanceClass - The instance class to check
 * @returns True if the instance class exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidRDSInstanceClass } from 'aws-instance-info'
 *
 * console.log(isValidRDSInstanceClass('db.m5.large')) // true
 * console.log(isValidRDSInstanceClass('db.m5.invalid')) // false
 * console.log(isValidRDSInstanceClass('db.t3.micro')) // true
 * ```
 */
export function isValidRDSInstanceClass(instanceClass: string): boolean {
  const info = getRDSInfo()
  return info.instances.includes(instanceClass as RDSInstanceClass)
}

/**
 * Check if an RDS instance family exists in the dataset.
 *
 * @param family - The family name to check
 * @returns True if the family exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidRDSFamily } from 'aws-instance-info'
 *
 * console.log(isValidRDSFamily('M5')) // true
 * console.log(isValidRDSFamily('R6g')) // true
 * console.log(isValidRDSFamily('Invalid')) // false
 * ```
 */
export function isValidRDSFamily(family: string): boolean {
  const info = getRDSInfo()
  return info.families.includes(family as RDSInstanceFamily)
}

/**
 * Get multiple RDS instance classes at once. More efficient than calling getRDSInstanceInfo
 * multiple times for batch operations.
 *
 * @param instanceClasses - Array of instance classes to fetch
 * @returns Map of instance class to details
 *
 * @example
 * ```typescript
 * import { getRDSInstances } from 'aws-instance-info'
 *
 * const instances = getRDSInstances(['db.m5.large', 'db.m5.xlarge', 'db.r6g.2xlarge'])
 *
 * for (const [cls, details] of instances) {
 *   console.log(`${cls}: ${details.vCPUs} vCPUs, ${details.memoryGiB} GiB`)
 * }
 * // db.m5.large: 2 vCPUs, 8 GiB
 * // db.m5.xlarge: 4 vCPUs, 16 GiB
 * // db.r6g.2xlarge: 8 vCPUs, 64 GiB
 * ```
 */
export function getRDSInstances(
  instanceClasses: RDSInstanceClass[],
): Map<RDSInstanceClass, RDSInstanceDetails> {
  const results = instanceClasses.map(instanceClass => {
    const details = getRDSInstanceInfo(instanceClass)
    return [instanceClass, details] as const
  })

  return new Map(results)
}

/**
 * Get multiple RDS families at once. More efficient than calling getRDSFamily
 * multiple times for batch operations.
 *
 * @param families - Array of family names to fetch
 * @returns Map of family name to family data
 *
 * @example
 * ```typescript
 * import { getRDSFamilies } from 'aws-instance-info'
 *
 * const families = getRDSFamilies(['M5', 'R6g', 'T3'])
 *
 * for (const [name, data] of families) {
 *   console.log(`${name}: ${data.category}, ${data.instanceClasses.length} classes`)
 * }
 * // M5: general_purpose, 12 classes
 * // R6g: memory_optimized, 11 classes
 * // T3: burstable_performance, 8 classes
 * ```
 */
export function getRDSFamilies(
  families: RDSInstanceFamily[],
): Map<RDSInstanceFamily, RDSFamilyData> {
  const results = families.map(family => {
    const data = getRDSFamily(family)
    return [family, data] as const
  })

  return new Map(results)
}

/**
 * Clear all RDS cached data.
 * Useful for testing or when you need to free memory.
 *
 * @example
 * ```typescript
 * import { clearRDSCache, getRDSCacheStats } from 'aws-instance-info'
 *
 * console.log(getRDSCacheStats()) // { instances: 10, families: 3, infoLoaded: true }
 *
 * clearRDSCache()
 *
 * console.log(getRDSCacheStats()) // { instances: 0, families: 0, infoLoaded: false }
 * ```
 */
export function clearRDSCache(): void {
  instanceCache.clear()
  familyCache.clear()
  infoCache = null
}

/**
 * Get RDS cache statistics.
 * Useful for debugging or monitoring memory usage.
 *
 * @returns Object with cache statistics
 *
 * @example
 * ```typescript
 * import { getRDSCacheStats, getRDSInstanceInfo } from 'aws-instance-info'
 *
 * getRDSInstanceInfo('db.m5.large')
 * getRDSInstanceInfo('db.m5.xlarge')
 *
 * const stats = getRDSCacheStats()
 * console.log(stats)
 * // { instances: 2, families: 0, infoLoaded: true }
 * ```
 */
export function getRDSCacheStats(): {
  instances: number
  families: number
  infoLoaded: boolean
} {
  return {
    instances: instanceCache.size,
    families: familyCache.size,
    infoLoaded: infoCache !== null,
  }
}
