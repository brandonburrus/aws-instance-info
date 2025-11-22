import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LRUCache } from 'lru-cache'

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
const instanceCache = new LRUCache<string, RDSInstanceDetails>({ max: 512 })
const familyCache = new LRUCache<string, RDSFamilyData>({ max: 256 })
let infoCache: RDSInfo | null = null

/* Internal helper function to load and parse JSON files */
async function loadJson<T>(relativePath: string): Promise<T> {
  const fullPath = join(DATA_DIR, relativePath)
  const content = await readFile(fullPath, 'utf-8')
  return JSON.parse(content) as T
}

/**
 * Get the RDS info manifest containing lists of all families and instance classes.
 * This is a lightweight file that can be used to enumerate available data.
 */
export async function getRDSInfo(): Promise<RDSInfo> {
  if (infoCache) {
    return infoCache
  }

  infoCache = await loadJson<RDSInfo>('info.json')
  return infoCache
}

/**
 * Get detailed information for a specific RDS instance class.
 * Loads only the JSON file for the requested instance class.
 *
 * @param instanceClass - The instance class (e.g., "db.m5.large")
 * @returns Instance class details
 */
export async function getRDSInstance(
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
 * Includes specifications for all instance classes in the family.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Family data including all instance class specifications
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
 * @returns Array of instance class names
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
 * @returns The category (e.g., "general_purpose")
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
 * @returns Array of all family names
 */
export async function getAllRDSFamilies(): Promise<RDSInstanceFamily[]> {
  const info = await getRDSInfo()
  return info.families
}

/**
 * Get all available RDS instance classes.
 *
 * @returns Array of all instance class names
 */
export async function getAllRDSInstanceClasses(): Promise<RDSInstanceClass[]> {
  const info = await getRDSInfo()
  return info.instances
}

/**
 * Get all available RDS categories.
 *
 * @returns Array of all category names
 */
export async function getAllRDSCategories(): Promise<RDSCategory[]> {
  const info = await getRDSInfo()
  return info.categories
}

/**
 * Check if an RDS instance class exists in the dataset.
 *
 * @param instanceClass - The instance class to check
 * @returns True if the instance class exists
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
 * @returns True if the family exists
 */
export async function isValidRDSFamily(family: string): Promise<boolean> {
  const info = await getRDSInfo()
  return info.families.includes(family as RDSInstanceFamily)
}

/**
 * Get multiple RDS instance classes at once.
 * More efficient than calling getRDSInstance() multiple times as it runs in parallel.
 *
 * @param instanceClasses - Array of instance classes to fetch
 * @returns Map of instance class to details
 */
export async function getRDSInstances(
  instanceClasses: RDSInstanceClass[],
): Promise<Map<RDSInstanceClass, RDSInstanceDetails>> {
  const results = await Promise.all(
    instanceClasses.map(async instanceClass => {
      const details = await getRDSInstance(instanceClass)
      return [instanceClass, details] as const
    }),
  )

  return new Map(results)
}

/**
 * Get multiple RDS families at once.
 * More efficient than calling getRDSFamily() multiple times as it runs in parallel.
 *
 * @param families - Array of family names to fetch
 * @returns Map of family name to family data
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

/**
 * Clear all RDS cached data.
 * Useful for testing or when you need to free memory.
 */
export function clearRDSCache(): void {
  instanceCache.clear()
  familyCache.clear()
  infoCache = null
}

/**
 * Get RDS cache statistics.
 * Useful for debugging or monitoring memory usage.
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
