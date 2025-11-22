import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  RDS_DATA_DIR,
  clearRDSCache,
  familyCache,
  getRDSCacheStats,
  infoCacheHolder,
  instanceCache,
} from './rds.cache.js'
import type {
  RDSCategory,
  RDSFamilyData,
  RDSInfo,
  RDSInstanceClass,
  RDSInstanceDetails,
  RDSInstanceFamily,
} from './types.js'

/* Re-export cache utilities (these remain synchronous) */
export { clearRDSCache, getRDSCacheStats }

/* Internal helper function to load and parse JSON files asynchronously */
async function loadJson<T>(relativePath: string): Promise<T> {
  const fullPath = join(RDS_DATA_DIR, relativePath)
  const content = await readFile(fullPath, 'utf-8')
  return JSON.parse(content) as T
}

/**
 * Get the RDS info manifest containing lists of all families and instance classes.
 * This is a lightweight file that can be used to enumerate available data.
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
  if (infoCacheHolder.value) {
    return infoCacheHolder.value
  }

  infoCacheHolder.value = await loadJson<RDSInfo>('info.json')
  return infoCacheHolder.value
}

/**
 * Get detailed information for a specific RDS instance class.
 * Loads only the JSON file for the requested instance class. Results are cached using LRU.
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
  instanceClass: RDSInstanceClass,
): Promise<RDSInstanceDetails> {
  const cached = instanceCache.get(instanceClass)
  if (cached) {
    return cached
  }

  const data = await loadJson<RDSInstanceDetails>(
    `instances/${instanceClass}.json`,
  )
  instanceCache.set(instanceClass, data)
  return data
}

/**
 * Get all data for an RDS instance family.
 * Includes the list of instance classes in the family. Results are cached using LRU.
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
export async function getRDSFamily(
  family: RDSInstanceFamily,
): Promise<RDSFamilyData> {
  const cached = familyCache.get(family)
  if (cached) {
    return cached
  }

  const data = await loadJson<RDSFamilyData>(`families/${family}.json`)
  familyCache.set(family, data)
  return data
}

/**
 * Get all instance classes belonging to a specific RDS family.
 * This loads the family file but only returns the list of instance classes.
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
  family: RDSInstanceFamily,
): Promise<RDSInstanceClass[]> {
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
export async function getRDSFamilyCategory(
  family: RDSInstanceFamily,
): Promise<RDSCategory> {
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
export async function getAllRDSFamilies(): Promise<RDSInstanceFamily[]> {
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
export async function getAllRDSInstanceClasses(): Promise<RDSInstanceClass[]> {
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
export async function getAllRDSCategories(): Promise<RDSCategory[]> {
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
  const info = await getRDSInfo()
  return info.instances.includes(instanceClass as RDSInstanceClass)
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
  const info = await getRDSInfo()
  return info.families.includes(family as RDSInstanceFamily)
}

/**
 * Get multiple RDS instance classes at once. Loads instances in parallel for better performance.
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
  instanceClasses: RDSInstanceClass[],
): Promise<Map<RDSInstanceClass, RDSInstanceDetails>> {
  const results = await Promise.all(
    instanceClasses.map(async instanceClass => {
      const details = await getRDSInstanceInfo(instanceClass)
      return [instanceClass, details] as const
    }),
  )

  return new Map(results)
}

/**
 * Get multiple RDS families at once. Loads families in parallel for better performance.
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
  families: RDSInstanceFamily[],
): Promise<Map<RDSInstanceFamily, RDSFamilyData>> {
  const results = await Promise.all(
    families.map(async family => {
      const data = await getRDSFamily(family)
      return [family, data] as const
    }),
  )

  return new Map(results)
}
