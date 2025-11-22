import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  ELASTICACHE_DATA_DIR,
  clearElastiCacheCache,
  familyCache,
  getElastiCacheCacheStats,
  infoCacheHolder,
  nodeCache,
} from './elasticache.cache.js'
import type {
  ElastiCacheCategory,
  ElastiCacheFamily,
  ElastiCacheFamilyData,
  ElastiCacheInfo,
  ElastiCacheNodeDetails,
  ElastiCacheNodeType,
} from './types.js'

/* Re-export cache utilities (these remain synchronous) */
export { clearElastiCacheCache, getElastiCacheCacheStats }

/* Internal helper function to load and parse JSON files asynchronously */
async function loadJson<T>(relativePath: string): Promise<T> {
  const fullPath = join(ELASTICACHE_DATA_DIR, relativePath)
  const content = await readFile(fullPath, 'utf-8')
  return JSON.parse(content) as T
}

/**
 * Get the Elasticache info manifest containing lists of all families and node types.
 * This is a lightweight file that can be used to enumerate available data.
 *
 * @returns Promise resolving to ElastiCacheInfo object with families, nodeTypes, and categories arrays
 *
 * @example
 * ```typescript
 * import { getElastiCacheInfo } from 'aws-instance-info/async'
 *
 * const info = await getElastiCacheInfo()
 * console.log(info.families) // ['M5', 'R6g', 'T3', ...]
 * console.log(info.nodeTypes) // ['cache.m5.large', 'cache.r6g.xlarge', ...]
 * console.log(info.categories) // ['general_purpose', 'memory_optimized', ...]
 * ```
 */
export async function getElastiCacheInfo(): Promise<ElastiCacheInfo> {
  if (infoCacheHolder.value) {
    return infoCacheHolder.value
  }

  infoCacheHolder.value = await loadJson<ElastiCacheInfo>('info.json')
  return infoCacheHolder.value
}

/**
 * Get detailed information for a specific Elasticache node type.
 * Loads only the JSON file for the requested node type. Results are cached using LRU.
 *
 * @param nodeType - The node type (e.g., "cache.m5.large")
 * @returns Promise resolving to node type details including vCPUs, memory, and network specs
 *
 * @example
 * ```typescript
 * import { getElastiCacheNodeInfo } from 'aws-instance-info/async'
 *
 * const node = await getElastiCacheNodeInfo('cache.m5.large')
 * console.log(node.nodeType) // 'cache.m5.large'
 * console.log(node.vCPUs) // 2
 * console.log(node.memoryGiB) // 6.38
 * console.log(node.networkPerformance) // 'Up to 10 Gigabit'
 * ```
 */
export async function getElastiCacheNodeInfo(
  nodeType: ElastiCacheNodeType,
): Promise<ElastiCacheNodeDetails> {
  const cached = nodeCache.get(nodeType)
  if (cached) {
    return cached
  }

  const data = await loadJson<ElastiCacheNodeDetails>(`nodes/${nodeType}.json`)
  nodeCache.set(nodeType, data)
  return data
}

/**
 * Get all data for an Elasticache node family.
 * Includes the list of node types in the family. Results are cached using LRU.
 *
 * @param family - The node family (e.g., "M5")
 * @returns Promise resolving to family data including category and node type list
 *
 * @example
 * ```typescript
 * import { getElastiCacheFamily } from 'aws-instance-info/async'
 *
 * const family = await getElastiCacheFamily('M5')
 * console.log(family.category) // 'general_purpose'
 * console.log(family.nodeTypes) // ['cache.m5.large', 'cache.m5.xlarge', ...]
 * ```
 */
export async function getElastiCacheFamily(
  family: ElastiCacheFamily,
): Promise<ElastiCacheFamilyData> {
  const cached = familyCache.get(family)
  if (cached) {
    return cached
  }

  const data = await loadJson<ElastiCacheFamilyData>(`families/${family}.json`)
  familyCache.set(family, data)
  return data
}

/**
 * Get all node types belonging to a specific Elasticache family.
 * This loads the family file but only returns the list of node types.
 *
 * @param family - The node family (e.g., "M5")
 * @returns Promise resolving to array of node type names in the family
 *
 * @example
 * ```typescript
 * import { getElastiCacheFamilyNodeTypes } from 'aws-instance-info/async'
 *
 * const nodeTypes = await getElastiCacheFamilyNodeTypes('M5')
 * console.log(nodeTypes) // ['cache.m5.large', 'cache.m5.xlarge', 'cache.m5.2xlarge', ...]
 * ```
 */
export async function getElastiCacheFamilyNodeTypes(
  family: ElastiCacheFamily,
): Promise<ElastiCacheNodeType[]> {
  const familyData = await getElastiCacheFamily(family)
  return familyData.nodeTypes
}

/**
 * Get the category for an Elasticache node family.
 *
 * @param family - The node family (e.g., "M5")
 * @returns Promise resolving to the category (e.g., "general_purpose")
 *
 * @example
 * ```typescript
 * import { getElastiCacheFamilyCategory } from 'aws-instance-info/async'
 *
 * const category = await getElastiCacheFamilyCategory('M5')
 * console.log(category) // 'general_purpose'
 *
 * const category2 = await getElastiCacheFamilyCategory('R6g')
 * console.log(category2) // 'memory_optimized'
 * ```
 */
export async function getElastiCacheFamilyCategory(
  family: ElastiCacheFamily,
): Promise<ElastiCacheCategory> {
  const familyData = await getElastiCacheFamily(family)
  return familyData.category
}

/**
 * Get all available Elasticache node families.
 *
 * @returns Promise resolving to array of all family names
 *
 * @example
 * ```typescript
 * import { getAllElastiCacheFamilies } from 'aws-instance-info/async'
 *
 * const families = await getAllElastiCacheFamilies()
 * console.log(families) // ['M5', 'M6g', 'R6g', 'R7g', 'T3', 'T4g', ...]
 * console.log(families.length) // ~13
 * ```
 */
export async function getAllElastiCacheFamilies(): Promise<
  ElastiCacheFamily[]
> {
  const info = await getElastiCacheInfo()
  return info.families
}

/**
 * Get all available Elasticache node types.
 *
 * @returns Promise resolving to array of all node type names
 *
 * @example
 * ```typescript
 * import { getAllElastiCacheNodeTypes } from 'aws-instance-info/async'
 *
 * const nodeTypes = await getAllElastiCacheNodeTypes()
 * console.log(nodeTypes) // ['cache.m5.large', 'cache.m5.xlarge', 'cache.r6g.2xlarge', ...]
 * console.log(nodeTypes.length) // ~73
 * ```
 */
export async function getAllElastiCacheNodeTypes(): Promise<
  ElastiCacheNodeType[]
> {
  const info = await getElastiCacheInfo()
  return info.nodeTypes
}

/**
 * Get all available Elasticache categories.
 *
 * @returns Promise resolving to array of all category names
 *
 * @example
 * ```typescript
 * import { getAllElastiCacheCategories } from 'aws-instance-info/async'
 *
 * const categories = await getAllElastiCacheCategories()
 * console.log(categories)
 * // ['general_purpose', 'memory_optimized', 'network_optimized', 'burstable_performance']
 * ```
 */
export async function getAllElastiCacheCategories(): Promise<
  ElastiCacheCategory[]
> {
  const info = await getElastiCacheInfo()
  return info.categories
}

/**
 * Check if an Elasticache node type exists in the dataset.
 *
 * @param nodeType - The node type to check
 * @returns Promise resolving to true if the node type exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidElastiCacheNodeType } from 'aws-instance-info/async'
 *
 * console.log(await isValidElastiCacheNodeType('cache.m5.large')) // true
 * console.log(await isValidElastiCacheNodeType('cache.m5.invalid')) // false
 * console.log(await isValidElastiCacheNodeType('cache.t3.micro')) // true
 * ```
 */
export async function isValidElastiCacheNodeType(
  nodeType: string,
): Promise<boolean> {
  const info = await getElastiCacheInfo()
  return info.nodeTypes.includes(nodeType as ElastiCacheNodeType)
}

/**
 * Check if an Elasticache node family exists in the dataset.
 *
 * @param family - The family name to check
 * @returns Promise resolving to true if the family exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidElastiCacheFamily } from 'aws-instance-info/async'
 *
 * console.log(await isValidElastiCacheFamily('M5')) // true
 * console.log(await isValidElastiCacheFamily('R6g')) // true
 * console.log(await isValidElastiCacheFamily('Invalid')) // false
 * ```
 */
export async function isValidElastiCacheFamily(
  family: string,
): Promise<boolean> {
  const info = await getElastiCacheInfo()
  return info.families.includes(family as ElastiCacheFamily)
}

/**
 * Get multiple Elasticache node types at once. Loads nodes in parallel for better performance.
 *
 * @param nodeTypes - Array of node types to fetch
 * @returns Promise resolving to Map of node type to details
 *
 * @example
 * ```typescript
 * import { getElastiCacheNodes } from 'aws-instance-info/async'
 *
 * const nodes = await getElastiCacheNodes(['cache.m5.large', 'cache.m5.xlarge', 'cache.r6g.2xlarge'])
 *
 * for (const [type, details] of nodes) {
 *   console.log(`${type}: ${details.vCPUs} vCPUs, ${details.memoryGiB} GiB`)
 * }
 * // cache.m5.large: 2 vCPUs, 6.38 GiB
 * // cache.m5.xlarge: 4 vCPUs, 12.93 GiB
 * // cache.r6g.2xlarge: 8 vCPUs, 52.82 GiB
 * ```
 */
export async function getElastiCacheNodes(
  nodeTypes: ElastiCacheNodeType[],
): Promise<Map<ElastiCacheNodeType, ElastiCacheNodeDetails>> {
  const results = await Promise.all(
    nodeTypes.map(async nodeType => {
      const details = await getElastiCacheNodeInfo(nodeType)
      return [nodeType, details] as const
    }),
  )

  return new Map(results)
}

/**
 * Get multiple Elasticache families at once. Loads families in parallel for better performance.
 *
 * @param families - Array of family names to fetch
 * @returns Promise resolving to Map of family name to family data
 *
 * @example
 * ```typescript
 * import { getElastiCacheFamilies } from 'aws-instance-info/async'
 *
 * const families = await getElastiCacheFamilies(['M5', 'R6g', 'T3'])
 *
 * for (const [name, data] of families) {
 *   console.log(`${name}: ${data.category}, ${data.nodeTypes.length} node types`)
 * }
 * // M5: general_purpose, 6 node types
 * // R6g: memory_optimized, 7 node types
 * // T3: burstable_performance, 3 node types
 * ```
 */
export async function getElastiCacheFamilies(
  families: ElastiCacheFamily[],
): Promise<Map<ElastiCacheFamily, ElastiCacheFamilyData>> {
  const results = await Promise.all(
    families.map(async family => {
      const data = await getElastiCacheFamily(family)
      return [family, data] as const
    }),
  )

  return new Map(results)
}
