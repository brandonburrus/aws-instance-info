import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  EC2_DATA_DIR,
  clearEC2Cache,
  familyCache,
  getEC2CacheStats,
  infoCacheHolder,
  instanceCache,
} from './ec2.cache.js'
import type {
  EC2Category,
  EC2FamilyData,
  EC2Info,
  EC2InstanceDetails,
  EC2InstanceFamily,
  EC2InstanceType,
} from './types.js'

/* Re-export cache utilities (these remain synchronous) */
export { clearEC2Cache, getEC2CacheStats }

/* Internal helper function to load and parse JSON files asynchronously */
async function loadJson<T>(relativePath: string): Promise<T> {
  const fullPath = join(EC2_DATA_DIR, relativePath)
  const content = await readFile(fullPath, 'utf-8')
  return JSON.parse(content) as T
}

/**
 * Get the EC2 info manifest containing lists of all families and instance types.
 * This is a lightweight file that can be used to enumerate available data.
 *
 * @returns Promise resolving to EC2Info object with families, instances, and categories arrays
 *
 * @example
 * ```typescript
 * import { getEC2Info } from 'aws-instance-info/async'
 *
 * const info = await getEC2Info()
 * console.log(info.families) // ['M5', 'C7', 'R6i', ...]
 * console.log(info.instances) // ['m5.large', 'c7.xlarge', ...]
 * console.log(info.categories) // ['general_purpose', 'compute_optimized', ...]
 * ```
 */
export async function getEC2Info(): Promise<EC2Info> {
  if (infoCacheHolder.value) {
    return infoCacheHolder.value
  }

  infoCacheHolder.value = await loadJson<EC2Info>('info.json')
  return infoCacheHolder.value
}

/**
 * Get detailed information for a specific EC2 instance type.
 * Loads only the JSON file for the requested instance. Results are cached using LRU.
 *
 * @param instanceType - The instance type (e.g., "m5.large")
 * @returns Promise resolving to instance details including performance, networking, EBS, and security specs
 *
 * @example
 * ```typescript
 * import { getEC2InstanceInfo } from 'aws-instance-info/async'
 *
 * const instance = await getEC2InstanceInfo('m5.large')
 * console.log(instance.instanceType) // 'm5.large'
 * console.log(instance.vCPUs) // 2
 * console.log(instance.memoryGiB) // 8
 * console.log(instance.hypervisor) // 'Nitro v2'
 * ```
 */
export async function getEC2InstanceInfo(
  instanceType: EC2InstanceType,
): Promise<EC2InstanceDetails> {
  const cached = instanceCache.get(instanceType)
  if (cached) {
    return cached
  }

  const data = await loadJson<EC2InstanceDetails>(
    `instances/${instanceType}.json`,
  )
  instanceCache.set(instanceType, data)
  return data
}

/**
 * Get all data for an EC2 instance family.
 * Includes the family metadata and list of instance types in the family.
 * Results are cached using LRU.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Promise resolving to family data including metadata and instance type list
 *
 * @example
 * ```typescript
 * import { getEC2Family } from 'aws-instance-info/async'
 *
 * const family = await getEC2Family('M5')
 * console.log(family.category) // 'general_purpose'
 * console.log(family.instanceTypes) // ['m5.large', 'm5.xlarge', ...]
 * console.log(family.hypervisor) // 'Nitro v2'
 * console.log(family.processorArchitecture) // 'Intel (x86_64)'
 * ```
 */
export async function getEC2Family(
  family: EC2InstanceFamily,
): Promise<EC2FamilyData> {
  const cached = familyCache.get(family)
  if (cached) {
    return cached
  }

  const data = await loadJson<EC2FamilyData>(`families/${family}.json`)
  familyCache.set(family, data)
  return data
}

/**
 * Get all instance types belonging to a specific EC2 family.
 * This loads the family file but only returns the list of instance types.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Promise resolving to array of instance type names in the family
 *
 * @example
 * ```typescript
 * import { getEC2FamilyInstanceTypes } from 'aws-instance-info/async'
 *
 * const types = await getEC2FamilyInstanceTypes('M5')
 * console.log(types) // ['m5.large', 'm5.xlarge', 'm5.2xlarge', ...]
 * ```
 */
export async function getEC2FamilyInstanceTypes(
  family: EC2InstanceFamily,
): Promise<EC2InstanceType[]> {
  const familyData = await getEC2Family(family)
  return familyData.instanceTypes
}

/**
 * Get the category for an EC2 instance family.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Promise resolving to the category (e.g., "general_purpose")
 *
 * @example
 * ```typescript
 * import { getEC2FamilyCategory } from 'aws-instance-info/async'
 *
 * const category = await getEC2FamilyCategory('M5')
 * console.log(category) // 'general_purpose'
 *
 * const category2 = await getEC2FamilyCategory('C7')
 * console.log(category2) // 'compute_optimized'
 * ```
 */
export async function getEC2FamilyCategory(
  family: EC2InstanceFamily,
): Promise<EC2Category> {
  const familyData = await getEC2Family(family)
  return familyData.category
}

/**
 * Get all available EC2 instance families.
 *
 * @returns Promise resolving to array of all family names
 *
 * @example
 * ```typescript
 * import { getAllEC2Families } from 'aws-instance-info/async'
 *
 * const families = await getAllEC2Families()
 * console.log(families) // ['M5', 'M5a', 'M5ad', 'M5d', 'C7', 'C7g', ...]
 * console.log(families.length) // ~150
 * ```
 */
export async function getAllEC2Families(): Promise<EC2InstanceFamily[]> {
  const info = await getEC2Info()
  return info.families
}

/**
 * Get all available EC2 instance types.
 *
 * @returns Promise resolving to array of all instance type names
 *
 * @example
 * ```typescript
 * import { getAllEC2InstanceTypes } from 'aws-instance-info/async'
 *
 * const types = await getAllEC2InstanceTypes()
 * console.log(types) // ['m5.large', 'm5.xlarge', 'c7.2xlarge', ...]
 * console.log(types.length) // ~1000
 * ```
 */
export async function getAllEC2InstanceTypes(): Promise<EC2InstanceType[]> {
  const info = await getEC2Info()
  return info.instances
}

/**
 * Get all available EC2 categories.
 *
 * @returns Promise resolving to array of all category names
 *
 * @example
 * ```typescript
 * import { getAllEC2Categories } from 'aws-instance-info/async'
 *
 * const categories = await getAllEC2Categories()
 * console.log(categories)
 * // ['general_purpose', 'compute_optimized', 'memory_optimized',
 * //  'storage_optimized', 'accelerated_computing', 'hpc']
 * ```
 */
export async function getAllEC2Categories(): Promise<EC2Category[]> {
  const info = await getEC2Info()
  return info.categories
}

/**
 * Check if an EC2 instance type exists in the dataset.
 *
 * @param instanceType - The instance type to check
 * @returns Promise resolving to true if the instance type exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidEC2InstanceType } from 'aws-instance-info/async'
 *
 * console.log(await isValidEC2InstanceType('m5.large')) // true
 * console.log(await isValidEC2InstanceType('m5.invalid')) // false
 * console.log(await isValidEC2InstanceType('t3.micro')) // true
 * ```
 */
export async function isValidEC2InstanceType(
  instanceType: string,
): Promise<boolean> {
  const info = await getEC2Info()
  return info.instances.includes(instanceType as EC2InstanceType)
}

/**
 * Check if an EC2 instance family exists in the dataset.
 *
 * @param family - The family name to check
 * @returns Promise resolving to true if the family exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidEC2Family } from 'aws-instance-info/async'
 *
 * console.log(await isValidEC2Family('M5')) // true
 * console.log(await isValidEC2Family('C7')) // true
 * console.log(await isValidEC2Family('Invalid')) // false
 * ```
 */
export async function isValidEC2Family(family: string): Promise<boolean> {
  const info = await getEC2Info()
  return info.families.includes(family as EC2InstanceFamily)
}

/**
 * Get multiple EC2 instances at once. Loads instances in parallel for better performance.
 *
 * @param instanceTypes - Array of instance types to fetch
 * @returns Promise resolving to Map of instance type to details
 *
 * @example
 * ```typescript
 * import { getEC2Instances } from 'aws-instance-info/async'
 *
 * const instances = await getEC2Instances(['m5.large', 'm5.xlarge', 'c7.2xlarge'])
 *
 * for (const [type, details] of instances) {
 *   console.log(`${type}: ${details.vCPUs} vCPUs`)
 * }
 * // m5.large: 2 vCPUs
 * // m5.xlarge: 4 vCPUs
 * // c7.2xlarge: 8 vCPUs
 * ```
 */
export async function getEC2Instances(
  instanceTypes: EC2InstanceType[],
): Promise<Map<EC2InstanceType, EC2InstanceDetails>> {
  const results = await Promise.all(
    instanceTypes.map(async type => {
      const details = await getEC2InstanceInfo(type)
      return [type, details] as const
    }),
  )

  return new Map(results)
}

/**
 * Get multiple EC2 families at once. Loads families in parallel for better performance.
 *
 * @param families - Array of family names to fetch
 * @returns Promise resolving to Map of family name to family data
 *
 * @example
 * ```typescript
 * import { getEC2Families } from 'aws-instance-info/async'
 *
 * const families = await getEC2Families(['M5', 'C7', 'R6i'])
 *
 * for (const [name, data] of families) {
 *   console.log(`${name}: ${data.category}, ${data.instanceTypes.length} types`)
 * }
 * // M5: general_purpose, 24 types
 * // C7: compute_optimized, 12 types
 * // R6i: memory_optimized, 16 types
 * ```
 */
export async function getEC2Families(
  families: EC2InstanceFamily[],
): Promise<Map<EC2InstanceFamily, EC2FamilyData>> {
  const results = await Promise.all(
    families.map(async family => {
      const data = await getEC2Family(family)
      return [family, data] as const
    }),
  )

  return new Map(results)
}
