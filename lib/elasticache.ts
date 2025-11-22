import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LRUCache } from 'lru-cache'

import {
  ELASTICACHE_FAMILY_CACHE_SIZE,
  ELASTICACHE_NODE_CACHE_SIZE,
} from './constants.js'
import type {
  ElastiCacheCategory,
  ElastiCacheFamily,
  ElastiCacheFamilyData,
  ElastiCacheInfo,
  ElastiCacheNodeDetails,
  ElastiCacheNodeType,
} from './types.js'

/* File Paths */
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_DIR = join(__dirname, '..', 'data', 'elasticache')

/* Internal Caches */
const nodeCache = new LRUCache<string, ElastiCacheNodeDetails>({
  max: ELASTICACHE_NODE_CACHE_SIZE,
})
const familyCache = new LRUCache<string, ElastiCacheFamilyData>({
  max: ELASTICACHE_FAMILY_CACHE_SIZE,
})
let infoCache: ElastiCacheInfo | null = null

/* Internal helper function to load and parse JSON files */
function loadJson<T>(relativePath: string): T {
  const fullPath = join(DATA_DIR, relativePath)
  const content = readFileSync(fullPath, 'utf-8')
  return JSON.parse(content) as T
}

/**
 * Get the Elasticache info manifest containing lists of all families and node types.
 * This is a lightweight file that can be used to enumerate available data.
 *
 * @returns ElastiCacheInfo object with families, nodeTypes, and categories arrays
 *
 * @example
 * ```typescript
 * import { getElastiCacheInfo } from 'aws-instance-info'
 *
 * const info = getElastiCacheInfo()
 * console.log(info.families) // ['M5', 'R6g', 'T3', ...]
 * console.log(info.nodeTypes) // ['cache.m5.large', 'cache.r6g.xlarge', ...]
 * console.log(info.categories) // ['general_purpose', 'memory_optimized', ...]
 * ```
 */
export function getElastiCacheInfo(): ElastiCacheInfo {
  if (infoCache) {
    return infoCache
  }

  infoCache = loadJson<ElastiCacheInfo>('info.json')
  return infoCache
}

/**
 * Get detailed information for a specific Elasticache node type.
 * Loads only the JSON file for the requested node type. Results are cached using LRU.
 *
 * @param nodeType - The node type (e.g., "cache.m5.large")
 * @returns Node type details including vCPUs, memory, and network specs
 *
 * @example
 * ```typescript
 * import { getElastiCacheNodeInfo } from 'aws-instance-info'
 *
 * const node = getElastiCacheNodeInfo('cache.m5.large')
 * console.log(node.nodeType) // 'cache.m5.large'
 * console.log(node.vCPUs) // 2
 * console.log(node.memoryGiB) // 6.38
 * console.log(node.networkPerformance) // 'Up to 10 Gigabit'
 * ```
 */
export function getElastiCacheNodeInfo(
  nodeType: ElastiCacheNodeType,
): ElastiCacheNodeDetails {
  const cached = nodeCache.get(nodeType)
  if (cached) {
    return cached
  }

  const data = loadJson<ElastiCacheNodeDetails>(`nodes/${nodeType}.json`)
  nodeCache.set(nodeType, data)
  return data
}

/**
 * Get all data for an Elasticache node family.
 * Includes the list of node types in the family. Results are cached using LRU.
 *
 * @param family - The node family (e.g., "M5")
 * @returns Family data including category and node type list
 *
 * @example
 * ```typescript
 * import { getElastiCacheFamily } from 'aws-instance-info'
 *
 * const family = getElastiCacheFamily('M5')
 * console.log(family.category) // 'general_purpose'
 * console.log(family.nodeTypes) // ['cache.m5.large', 'cache.m5.xlarge', ...]
 * ```
 */
export function getElastiCacheFamily(
  family: ElastiCacheFamily,
): ElastiCacheFamilyData {
  const cached = familyCache.get(family)
  if (cached) {
    return cached
  }

  const data = loadJson<ElastiCacheFamilyData>(`families/${family}.json`)
  familyCache.set(family, data)
  return data
}

/**
 * Get all node types belonging to a specific Elasticache family.
 * This loads the family file but only returns the list of node types.
 *
 * @param family - The node family (e.g., "M5")
 * @returns Array of node type names in the family
 *
 * @example
 * ```typescript
 * import { getElastiCacheFamilyNodeTypes } from 'aws-instance-info'
 *
 * const nodeTypes = getElastiCacheFamilyNodeTypes('M5')
 * console.log(nodeTypes) // ['cache.m5.large', 'cache.m5.xlarge', 'cache.m5.2xlarge', ...]
 * ```
 */
export function getElastiCacheFamilyNodeTypes(
  family: ElastiCacheFamily,
): ElastiCacheNodeType[] {
  const familyData = getElastiCacheFamily(family)
  return familyData.nodeTypes
}

/**
 * Get the category for an Elasticache node family.
 *
 * @param family - The node family (e.g., "M5")
 * @returns The category (e.g., "general_purpose")
 *
 * @example
 * ```typescript
 * import { getElastiCacheFamilyCategory } from 'aws-instance-info'
 *
 * const category = getElastiCacheFamilyCategory('M5')
 * console.log(category) // 'general_purpose'
 *
 * const category2 = getElastiCacheFamilyCategory('R6g')
 * console.log(category2) // 'memory_optimized'
 * ```
 */
export function getElastiCacheFamilyCategory(
  family: ElastiCacheFamily,
): ElastiCacheCategory {
  const familyData = getElastiCacheFamily(family)
  return familyData.category
}

/**
 * Get all available Elasticache node families.
 *
 * @returns Array of all family names
 *
 * @example
 * ```typescript
 * import { getAllElastiCacheFamilies } from 'aws-instance-info'
 *
 * const families = getAllElastiCacheFamilies()
 * console.log(families) // ['M5', 'M6g', 'R6g', 'R7g', 'T3', 'T4g', ...]
 * console.log(families.length) // ~13
 * ```
 */
export function getAllElastiCacheFamilies(): ElastiCacheFamily[] {
  const info = getElastiCacheInfo()
  return info.families
}

/**
 * Get all available Elasticache node types.
 *
 * @returns Array of all node type names
 *
 * @example
 * ```typescript
 * import { getAllElastiCacheNodeTypes } from 'aws-instance-info'
 *
 * const nodeTypes = getAllElastiCacheNodeTypes()
 * console.log(nodeTypes) // ['cache.m5.large', 'cache.m5.xlarge', 'cache.r6g.2xlarge', ...]
 * console.log(nodeTypes.length) // ~73
 * ```
 */
export function getAllElastiCacheNodeTypes(): ElastiCacheNodeType[] {
  const info = getElastiCacheInfo()
  return info.nodeTypes
}

/**
 * Get all available Elasticache categories.
 *
 * @returns Array of all category names
 *
 * @example
 * ```typescript
 * import { getAllElastiCacheCategories } from 'aws-instance-info'
 *
 * const categories = getAllElastiCacheCategories()
 * console.log(categories)
 * // ['general_purpose', 'memory_optimized', 'network_optimized', 'burstable_performance']
 * ```
 */
export function getAllElastiCacheCategories(): ElastiCacheCategory[] {
  const info = getElastiCacheInfo()
  return info.categories
}

/**
 * Check if an Elasticache node type exists in the dataset.
 *
 * @param nodeType - The node type to check
 * @returns True if the node type exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidElastiCacheNodeType } from 'aws-instance-info'
 *
 * console.log(isValidElastiCacheNodeType('cache.m5.large')) // true
 * console.log(isValidElastiCacheNodeType('cache.m5.invalid')) // false
 * console.log(isValidElastiCacheNodeType('cache.t3.micro')) // true
 * ```
 */
export function isValidElastiCacheNodeType(nodeType: string): boolean {
  const info = getElastiCacheInfo()
  return info.nodeTypes.includes(nodeType as ElastiCacheNodeType)
}

/**
 * Check if an Elasticache node family exists in the dataset.
 *
 * @param family - The family name to check
 * @returns True if the family exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidElastiCacheFamily } from 'aws-instance-info'
 *
 * console.log(isValidElastiCacheFamily('M5')) // true
 * console.log(isValidElastiCacheFamily('R6g')) // true
 * console.log(isValidElastiCacheFamily('Invalid')) // false
 * ```
 */
export function isValidElastiCacheFamily(family: string): boolean {
  const info = getElastiCacheInfo()
  return info.families.includes(family as ElastiCacheFamily)
}

/**
 * Get multiple Elasticache node types at once. More efficient than calling getElastiCacheNodeInfo
 * multiple times for batch operations.
 *
 * @param nodeTypes - Array of node types to fetch
 * @returns Map of node type to details
 *
 * @example
 * ```typescript
 * import { getElastiCacheNodes } from 'aws-instance-info'
 *
 * const nodes = getElastiCacheNodes(['cache.m5.large', 'cache.m5.xlarge', 'cache.r6g.2xlarge'])
 *
 * for (const [type, details] of nodes) {
 *   console.log(`${type}: ${details.vCPUs} vCPUs, ${details.memoryGiB} GiB`)
 * }
 * // cache.m5.large: 2 vCPUs, 6.38 GiB
 * // cache.m5.xlarge: 4 vCPUs, 12.93 GiB
 * // cache.r6g.2xlarge: 8 vCPUs, 52.82 GiB
 * ```
 */
export function getElastiCacheNodes(
  nodeTypes: ElastiCacheNodeType[],
): Map<ElastiCacheNodeType, ElastiCacheNodeDetails> {
  const results = nodeTypes.map(nodeType => {
    const details = getElastiCacheNodeInfo(nodeType)
    return [nodeType, details] as const
  })

  return new Map(results)
}

/**
 * Get multiple Elasticache families at once. More efficient than calling getElastiCacheFamily
 * multiple times for batch operations.
 *
 * @param families - Array of family names to fetch
 * @returns Map of family name to family data
 *
 * @example
 * ```typescript
 * import { getElastiCacheFamilies } from 'aws-instance-info'
 *
 * const families = getElastiCacheFamilies(['M5', 'R6g', 'T3'])
 *
 * for (const [name, data] of families) {
 *   console.log(`${name}: ${data.category}, ${data.nodeTypes.length} node types`)
 * }
 * // M5: general_purpose, 6 node types
 * // R6g: memory_optimized, 7 node types
 * // T3: burstable_performance, 3 node types
 * ```
 */
export function getElastiCacheFamilies(
  families: ElastiCacheFamily[],
): Map<ElastiCacheFamily, ElastiCacheFamilyData> {
  const results = families.map(family => {
    const data = getElastiCacheFamily(family)
    return [family, data] as const
  })

  return new Map(results)
}

/**
 * Clear all Elasticache cached data.
 * Useful for testing or when you need to free memory.
 *
 * @example
 * ```typescript
 * import { clearElastiCacheCache, getElastiCacheCacheStats } from 'aws-instance-info'
 *
 * console.log(getElastiCacheCacheStats()) // { nodes: 10, families: 3, infoLoaded: true }
 *
 * clearElastiCacheCache()
 *
 * console.log(getElastiCacheCacheStats()) // { nodes: 0, families: 0, infoLoaded: false }
 * ```
 */
export function clearElastiCacheCache(): void {
  nodeCache.clear()
  familyCache.clear()
  infoCache = null
}

/**
 * Get Elasticache cache statistics.
 * Useful for debugging or monitoring memory usage.
 *
 * @returns Object with cache statistics
 *
 * @example
 * ```typescript
 * import { getElastiCacheCacheStats, getElastiCacheNodeInfo } from 'aws-instance-info'
 *
 * getElastiCacheNodeInfo('cache.m5.large')
 * getElastiCacheNodeInfo('cache.m5.xlarge')
 *
 * const stats = getElastiCacheCacheStats()
 * console.log(stats)
 * // { nodes: 2, families: 0, infoLoaded: true }
 * ```
 */
export function getElastiCacheCacheStats(): {
  nodes: number
  families: number
  infoLoaded: boolean
} {
  return {
    nodes: nodeCache.size,
    families: familyCache.size,
    infoLoaded: infoCache !== null,
  }
}
