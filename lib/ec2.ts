import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LRUCache } from 'lru-cache'

import type {
  EC2Category,
  EC2FamilyData,
  EC2Info,
  EC2InstanceDetails,
  EC2InstanceFamily,
  EC2InstanceType,
} from './types.js'

/* File Paths */
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_DIR = join(__dirname, '..', 'data', 'ec2')

/* Internal Caches */
const instanceCache = new LRUCache<string, EC2InstanceDetails>({ max: 512 })
const familyCache = new LRUCache<string, EC2FamilyData>({ max: 256 })
let infoCache: EC2Info | null = null

/* Internal helper function to load and parse JSON files */
async function loadJson<T>(relativePath: string): Promise<T> {
  const fullPath = join(DATA_DIR, relativePath)
  const content = await readFile(fullPath, 'utf-8')
  return JSON.parse(content) as T
}

/**
 * Get the EC2 info manifest containing lists of all families and instance types.
 * This is a lightweight file that can be used to enumerate available data.
 */
export async function getEC2Info(): Promise<EC2Info> {
  if (infoCache) {
    return infoCache
  }

  infoCache = await loadJson<EC2Info>('info.json')
  return infoCache
}

/**
 * Get detailed information for a specific EC2 instance type.
 * Loads only the JSON file for the requested instance.
 *
 * @param instanceType - The instance type (e.g., "m5.large")
 * @returns Instance details
 */
export async function getEC2Instance(
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
 * Includes the family summary and specifications for all instance types in the family.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Family data including all instance specifications
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
 * @returns Array of instance type names
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
 * @returns The category (e.g., "general_purpose")
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
 * @returns Array of all family names
 */
export async function getAllEC2Families(): Promise<EC2InstanceFamily[]> {
  const info = await getEC2Info()
  return info.families
}

/**
 * Get all available EC2 instance types.
 *
 * @returns Array of all instance type names
 */
export async function getAllEC2InstanceTypes(): Promise<EC2InstanceType[]> {
  const info = await getEC2Info()
  return info.instances
}

/**
 * Get all available EC2 categories.
 *
 * @returns Array of all category names
 */
export async function getAllEC2Categories(): Promise<EC2Category[]> {
  const info = await getEC2Info()
  return info.categories
}

/**
 * Check if an EC2 instance type exists in the dataset.
 *
 * @param instanceType - The instance type to check
 * @returns True if the instance type exists
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
 * @returns True if the family exists
 */
export async function isValidEC2Family(family: string): Promise<boolean> {
  const info = await getEC2Info()
  return info.families.includes(family as EC2InstanceFamily)
}

/**
 * Get multiple EC2 instances at once.
 * More efficient than calling getEC2Instance() multiple times as it runs in parallel.
 *
 * @param instanceTypes - Array of instance types to fetch
 * @returns Map of instance type to details
 */
export async function getEC2Instances(
  instanceTypes: EC2InstanceType[],
): Promise<Map<EC2InstanceType, EC2InstanceDetails>> {
  const results = await Promise.all(
    instanceTypes.map(async type => {
      const details = await getEC2Instance(type)
      return [type, details] as const
    }),
  )

  return new Map(results)
}

/**
 * Get multiple EC2 families at once.
 * More efficient than calling getEC2Family() multiple times as it runs in parallel.
 *
 * @param families - Array of family names to fetch
 * @returns Map of family name to family data
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

/**
 * Clear all EC2 cached data.
 * Useful for testing or when you need to free memory.
 */
export function clearEC2Cache(): void {
  instanceCache.clear()
  familyCache.clear()
  infoCache = null
}

/**
 * Get EC2 cache statistics.
 * Useful for debugging or monitoring memory usage.
 */
export function getEC2CacheStats(): {
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
