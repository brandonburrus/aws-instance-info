import { readFileSync } from 'node:fs'
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

/* Re-export cache utilities */
export { clearEC2Cache, getEC2CacheStats }

/* Internal helper function to load and parse JSON files */
function loadJson<T>(relativePath: string): T {
  const fullPath = join(EC2_DATA_DIR, relativePath)
  const content = readFileSync(fullPath, 'utf-8')
  return JSON.parse(content) as T
}

/**
 * Get the EC2 info manifest containing lists of all families and instance types.
 * This is a lightweight file that can be used to enumerate available data.
 *
 * @returns EC2Info object with families, instances, and categories arrays
 *
 * @example
 * ```typescript
 * import { getEC2Info } from 'aws-instance-info'
 *
 * const info = getEC2Info()
 * console.log(info.families) // ['M5', 'C7', 'R6i', ...]
 * console.log(info.instances) // ['m5.large', 'c7.xlarge', ...]
 * console.log(info.categories) // ['general_purpose', 'compute_optimized', ...]
 * ```
 */
export function getEC2Info(): EC2Info {
  if (infoCacheHolder.value) {
    return infoCacheHolder.value
  }

  infoCacheHolder.value = loadJson<EC2Info>('info.json')
  return infoCacheHolder.value
}

/**
 * Get detailed information for a specific EC2 instance type.
 * Loads only the JSON file for the requested instance. Results are cached using LRU.
 *
 * @param instanceType - The instance type (e.g., "m5.large")
 * @returns Instance details including performance, networking, EBS, and security specs
 *
 * @example
 * ```typescript
 * import { getEC2InstanceInfo } from 'aws-instance-info'
 *
 * const instance = getEC2InstanceInfo('m5.large')
 * console.log(instance.instanceType) // 'm5.large'
 * console.log(instance.vCPUs) // 2
 * console.log(instance.memoryGiB) // 8
 * console.log(instance.hypervisor) // 'Nitro v2'
 * ```
 */
export function getEC2InstanceInfo(
  instanceType: EC2InstanceType,
): EC2InstanceDetails {
  const cached = instanceCache.get(instanceType)
  if (cached) {
    return cached
  }

  const data = loadJson<EC2InstanceDetails>(`instances/${instanceType}.json`)
  instanceCache.set(instanceType, data)
  return data
}

/**
 * Get all data for an EC2 instance family.
 * Includes the family metadata and list of instance types in the family.
 * Results are cached using LRU.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Family data including metadata and instance type list
 *
 * @example
 * ```typescript
 * import { getEC2Family } from 'aws-instance-info'
 *
 * const family = getEC2Family('M5')
 * console.log(family.category) // 'general_purpose'
 * console.log(family.instanceTypes) // ['m5.large', 'm5.xlarge', ...]
 * console.log(family.hypervisor) // 'Nitro v2'
 * console.log(family.processorArchitecture) // 'Intel (x86_64)'
 * ```
 */
export function getEC2Family(family: EC2InstanceFamily): EC2FamilyData {
  const cached = familyCache.get(family)
  if (cached) {
    return cached
  }

  const data = loadJson<EC2FamilyData>(`families/${family}.json`)
  familyCache.set(family, data)
  return data
}

/**
 * Get all instance types belonging to a specific EC2 family.
 * This loads the family file but only returns the list of instance types.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Array of instance type names in the family
 *
 * @example
 * ```typescript
 * import { getEC2FamilyInstanceTypes } from 'aws-instance-info'
 *
 * const types = getEC2FamilyInstanceTypes('M5')
 * console.log(types) // ['m5.large', 'm5.xlarge', 'm5.2xlarge', ...]
 * ```
 */
export function getEC2FamilyInstanceTypes(
  family: EC2InstanceFamily,
): EC2InstanceType[] {
  const familyData = getEC2Family(family)
  return familyData.instanceTypes
}

/**
 * Get the category for an EC2 instance family.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns The category (e.g., "general_purpose")
 *
 * @example
 * ```typescript
 * import { getEC2FamilyCategory } from 'aws-instance-info'
 *
 * const category = getEC2FamilyCategory('M5')
 * console.log(category) // 'general_purpose'
 *
 * const category2 = getEC2FamilyCategory('C7')
 * console.log(category2) // 'compute_optimized'
 * ```
 */
export function getEC2FamilyCategory(family: EC2InstanceFamily): EC2Category {
  const familyData = getEC2Family(family)
  return familyData.category
}

/**
 * Get all available EC2 instance families.
 *
 * @returns Array of all family names
 *
 * @example
 * ```typescript
 * import { getAllEC2Families } from 'aws-instance-info'
 *
 * const families = getAllEC2Families()
 * console.log(families) // ['M5', 'M5a', 'M5ad', 'M5d', 'C7', 'C7g', ...]
 * console.log(families.length) // ~150
 * ```
 */
export function getAllEC2Families(): EC2InstanceFamily[] {
  const info = getEC2Info()
  return info.families
}

/**
 * Get all available EC2 instance types.
 *
 * @returns Array of all instance type names
 *
 * @example
 * ```typescript
 * import { getAllEC2InstanceTypes } from 'aws-instance-info'
 *
 * const types = getAllEC2InstanceTypes()
 * console.log(types) // ['m5.large', 'm5.xlarge', 'c7.2xlarge', ...]
 * console.log(types.length) // ~1000
 * ```
 */
export function getAllEC2InstanceTypes(): EC2InstanceType[] {
  const info = getEC2Info()
  return info.instances
}

/**
 * Get all available EC2 categories.
 *
 * @returns Array of all category names
 *
 * @example
 * ```typescript
 * import { getAllEC2Categories } from 'aws-instance-info'
 *
 * const categories = getAllEC2Categories()
 * console.log(categories)
 * // ['general_purpose', 'compute_optimized', 'memory_optimized',
 * //  'storage_optimized', 'accelerated_computing', 'hpc']
 * ```
 */
export function getAllEC2Categories(): EC2Category[] {
  const info = getEC2Info()
  return info.categories
}

/**
 * Check if an EC2 instance type exists in the dataset.
 *
 * @param instanceType - The instance type to check
 * @returns True if the instance type exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidEC2InstanceType } from 'aws-instance-info'
 *
 * console.log(isValidEC2InstanceType('m5.large')) // true
 * console.log(isValidEC2InstanceType('m5.invalid')) // false
 * console.log(isValidEC2InstanceType('t3.micro')) // true
 * ```
 */
export function isValidEC2InstanceType(instanceType: string): boolean {
  const info = getEC2Info()
  return info.instances.includes(instanceType as EC2InstanceType)
}

/**
 * Check if an EC2 instance family exists in the dataset.
 *
 * @param family - The family name to check
 * @returns True if the family exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidEC2Family } from 'aws-instance-info'
 *
 * console.log(isValidEC2Family('M5')) // true
 * console.log(isValidEC2Family('C7')) // true
 * console.log(isValidEC2Family('Invalid')) // false
 * ```
 */
export function isValidEC2Family(family: string): boolean {
  const info = getEC2Info()
  return info.families.includes(family as EC2InstanceFamily)
}

/**
 * Get multiple EC2 instances at once. More efficient than calling getEC2InstanceInfo
 * multiple times for batch operations.
 *
 * @param instanceTypes - Array of instance types to fetch
 * @returns Map of instance type to details
 *
 * @example
 * ```typescript
 * import { getEC2Instances } from 'aws-instance-info'
 *
 * const instances = getEC2Instances(['m5.large', 'm5.xlarge', 'c7.2xlarge'])
 *
 * for (const [type, details] of instances) {
 *   console.log(`${type}: ${details.vCPUs} vCPUs`)
 * }
 * // m5.large: 2 vCPUs
 * // m5.xlarge: 4 vCPUs
 * // c7.2xlarge: 8 vCPUs
 * ```
 */
export function getEC2Instances(
  instanceTypes: EC2InstanceType[],
): Map<EC2InstanceType, EC2InstanceDetails> {
  const results = instanceTypes.map(type => {
    const details = getEC2InstanceInfo(type)
    return [type, details] as const
  })

  return new Map(results)
}

/**
 * Get multiple EC2 families at once. More efficient than calling getEC2Family
 * multiple times for batch operations.
 *
 * @param families - Array of family names to fetch
 * @returns Map of family name to family data
 *
 * @example
 * ```typescript
 * import { getEC2Families } from 'aws-instance-info'
 *
 * const families = getEC2Families(['M5', 'C7', 'R6i'])
 *
 * for (const [name, data] of families) {
 *   console.log(`${name}: ${data.category}, ${data.instanceTypes.length} types`)
 * }
 * // M5: general_purpose, 24 types
 * // C7: compute_optimized, 12 types
 * // R6i: memory_optimized, 16 types
 * ```
 */
export function getEC2Families(
  families: EC2InstanceFamily[],
): Map<EC2InstanceFamily, EC2FamilyData> {
  const results = families.map(family => {
    const data = getEC2Family(family)
    return [family, data] as const
  })

  return new Map(results)
}
