import { LRUCache } from 'lru-cache'

import {
  ELASTICACHE_FAMILY_CACHE_SIZE,
  ELASTICACHE_NODE_CACHE_SIZE,
} from './constants.js'
import {
  ELASTICACHE_CATEGORIES,
  determineElastiCacheCategory,
  extractElastiCacheFamily,
  fetchElastiCacheNodes,
} from './fetch.js'
import type {
  ElastiCacheFamilyData,
  ElastiCacheInfo,
  ElastiCacheNodeDetails,
} from './types.js'

// === Inline Cache State ===

const nodeCache = new LRUCache<string, ElastiCacheNodeDetails>({
  max: ELASTICACHE_NODE_CACHE_SIZE,
})

const familyCache = new LRUCache<string, ElastiCacheFamilyData>({
  max: ELASTICACHE_FAMILY_CACHE_SIZE,
})

// Full dataset maps — held separately from LRU so entries are never evicted.
// The LRU is kept for API compatibility (getElastiCacheCacheStats / clearElastiCacheCache).
const nodeMap = new Map<string, ElastiCacheNodeDetails>()
const familyMap = new Map<string, ElastiCacheFamilyData>()

let infoCacheValue: ElastiCacheInfo | null = null

let initialized = false
let initPromise: Promise<void> | null = null

/**
 * Trigger the lazy bulk fetch of all ElastiCache node data.
 * Subsequent calls are no-ops — data is served from LRU cache.
 */
async function ensureInitialized(): Promise<void> {
  if (initialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    const all = await fetchElastiCacheNodes()

    // Populate node cache and full map
    for (const node of all) {
      nodeCache.set(node.nodeType, node)
      nodeMap.set(node.nodeType, node)
    }

    // Build family data from nodes
    const builtFamilyMap = new Map<string, ElastiCacheFamilyData>()
    for (const node of all) {
      const { family, category } = node
      let fd = builtFamilyMap.get(family)
      if (!fd) {
        fd = { family, category, nodeTypes: [] }
        builtFamilyMap.set(family, fd)
      }
      fd.nodeTypes.push(node.nodeType)
    }
    for (const [family, fd] of builtFamilyMap) {
      familyCache.set(family, fd)
      familyMap.set(family, fd)
    }

    // Build info manifest
    const families = [...builtFamilyMap.keys()].sort()
    const nodeTypes = all.map(n => n.nodeType).sort()
    const categories = ELASTICACHE_CATEGORIES
    infoCacheValue = { families, nodeTypes, categories }

    initialized = true
  })()

  return initPromise
}

// === Cache Utilities ===

/**
 * Clear all ElastiCache in-memory caches (nodes, families, info manifest).
 * The next call to any ElastiCache function will re-fetch all data from AWS docs.
 */
export function clearElastiCacheCache(): void {
  nodeCache.clear()
  familyCache.clear()
  nodeMap.clear()
  familyMap.clear()
  infoCacheValue = null
  initialized = false
  initPromise = null
}

/**
 * Get current ElastiCache LRU cache statistics.
 *
 * @returns Object with node and family cache sizes
 */
export function getElastiCacheCacheStats(): {
  nodeCacheSize: number
  familyCacheSize: number
} {
  return {
    nodeCacheSize: nodeCache.size,
    familyCacheSize: familyCache.size,
  }
}

// === Public API ===

/**
 * Get the ElastiCache info manifest containing lists of all families and node types.
 * Triggers the initial bulk fetch on first call; subsequent calls use cache.
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
  await ensureInitialized()
  return infoCacheValue as ElastiCacheInfo
}

/**
 * Get detailed information for a specific ElastiCache node type.
 * Triggers the initial bulk fetch on first call; subsequent calls use LRU cache.
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
  nodeType: string,
): Promise<ElastiCacheNodeDetails> {
  await ensureInitialized()
  const cached = nodeMap.get(nodeType)
  if (cached) return cached
  throw new Error(`Unknown ElastiCache node type: ${nodeType}`)
}

/**
 * Get all data for an ElastiCache node family.
 * Includes the list of node types in the family. Results are served from LRU cache.
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
  family: string,
): Promise<ElastiCacheFamilyData> {
  await ensureInitialized()
  const cached = familyMap.get(family)
  if (cached) return cached
  throw new Error(`Unknown ElastiCache family: ${family}`)
}

/**
 * Get all node types belonging to a specific ElastiCache family.
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
  family: string,
): Promise<string[]> {
  const familyData = await getElastiCacheFamily(family)
  return familyData.nodeTypes
}

/**
 * Get the category for an ElastiCache node family.
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
  family: string,
): Promise<string> {
  const familyData = await getElastiCacheFamily(family)
  return familyData.category
}

/**
 * Get all available ElastiCache node families.
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
export async function getAllElastiCacheFamilies(): Promise<string[]> {
  const info = await getElastiCacheInfo()
  return info.families
}

/**
 * Get all available ElastiCache node types.
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
export async function getAllElastiCacheNodeTypes(): Promise<string[]> {
  const info = await getElastiCacheInfo()
  return info.nodeTypes
}

/**
 * Get all available ElastiCache categories.
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
export async function getAllElastiCacheCategories(): Promise<string[]> {
  const info = await getElastiCacheInfo()
  return info.categories
}

/**
 * Check if an ElastiCache node type exists in the dataset.
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
  await ensureInitialized()
  return nodeMap.has(nodeType)
}

/**
 * Check if an ElastiCache node family exists in the dataset.
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
  await ensureInitialized()
  return familyMap.has(family)
}

/**
 * Get multiple ElastiCache node types at once.
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
  nodeTypes: string[],
): Promise<Map<string, ElastiCacheNodeDetails>> {
  const results = await Promise.all(
    nodeTypes.map(async nodeType => {
      const details = await getElastiCacheNodeInfo(nodeType)
      return [nodeType, details] as const
    }),
  )
  return new Map(results)
}

/**
 * Get multiple ElastiCache families at once.
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
  families: string[],
): Promise<Map<string, ElastiCacheFamilyData>> {
  const results = await Promise.all(
    families.map(async family => {
      const data = await getElastiCacheFamily(family)
      return [family, data] as const
    }),
  )
  return new Map(results)
}

// Re-export for convenience
export { determineElastiCacheCategory, extractElastiCacheFamily }
