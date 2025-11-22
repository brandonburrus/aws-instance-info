import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LRUCache } from 'lru-cache'

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
const nodeCache = new LRUCache<string, ElastiCacheNodeDetails>({ max: 512 })
const familyCache = new LRUCache<string, ElastiCacheFamilyData>({ max: 256 })
let infoCache: ElastiCacheInfo | null = null

/* Internal helper function to load and parse JSON files */
async function loadJson<T>(relativePath: string): Promise<T> {
  const fullPath = join(DATA_DIR, relativePath)
  const content = await readFile(fullPath, 'utf-8')
  return JSON.parse(content) as T
}

/**
 * Get the Elasticache info manifest containing lists of all families and node types.
 * This is a lightweight file that can be used to enumerate available data.
 */
export async function getElastiCacheInfo(): Promise<ElastiCacheInfo> {
  if (infoCache) {
    return infoCache
  }

  infoCache = await loadJson<ElastiCacheInfo>('info.json')
  return infoCache
}

/**
 * Get detailed information for a specific Elasticache node type.
 * Loads only the JSON file for the requested node type.
 *
 * @param nodeType - The node type (e.g., "cache.m5.large")
 * @returns Node type details
 */
export async function getElastiCacheNode(
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
 * Includes specifications for all node types in the family.
 *
 * @param family - The node family (e.g., "M5")
 * @returns Family data including all node type specifications
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
 * @returns Array of node type names
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
 * @returns The category (e.g., "general_purpose")
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
 * @returns Array of all family names
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
 * @returns Array of all node type names
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
 * @returns Array of all category names
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
 * @returns True if the node type exists
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
 * @returns True if the family exists
 */
export async function isValidElastiCacheFamily(
  family: string,
): Promise<boolean> {
  const info = await getElastiCacheInfo()
  return info.families.includes(family as ElastiCacheFamily)
}

/**
 * Get multiple Elasticache node types at once.
 * More efficient than calling getElastiCacheNode() multiple times as it runs in parallel.
 *
 * @param nodeTypes - Array of node types to fetch
 * @returns Map of node type to details
 */
export async function getElastiCacheNodes(
  nodeTypes: ElastiCacheNodeType[],
): Promise<Map<ElastiCacheNodeType, ElastiCacheNodeDetails>> {
  const results = await Promise.all(
    nodeTypes.map(async nodeType => {
      const details = await getElastiCacheNode(nodeType)
      return [nodeType, details] as const
    }),
  )

  return new Map(results)
}

/**
 * Get multiple Elasticache families at once.
 * More efficient than calling getElastiCacheFamily() multiple times as it runs in parallel.
 *
 * @param families - Array of family names to fetch
 * @returns Map of family name to family data
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

/**
 * Clear all Elasticache cached data.
 * Useful for testing or when you need to free memory.
 */
export function clearElastiCacheCache(): void {
  nodeCache.clear()
  familyCache.clear()
  infoCache = null
}

/**
 * Get Elasticache cache statistics.
 * Useful for debugging or monitoring memory usage.
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
