import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LRUCache } from 'lru-cache'

import {
  ELASTICACHE_FAMILY_CACHE_SIZE,
  ELASTICACHE_NODE_CACHE_SIZE,
} from './constants.js'
import type {
  ElastiCacheFamilyData,
  ElastiCacheInfo,
  ElastiCacheNodeDetails,
} from './types.js'

/* File Paths */
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** Base directory for Elasticache data files */
export const ELASTICACHE_DATA_DIR = join(__dirname, '..', 'data', 'elasticache')

/* Internal Caches - shared between sync and async APIs */
export const nodeCache = new LRUCache<string, ElastiCacheNodeDetails>({
  max: ELASTICACHE_NODE_CACHE_SIZE,
})
export const familyCache = new LRUCache<string, ElastiCacheFamilyData>({
  max: ELASTICACHE_FAMILY_CACHE_SIZE,
})

/** Info cache wrapper to allow mutation */
export const infoCacheHolder: { value: ElastiCacheInfo | null } = {
  value: null,
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
  infoCacheHolder.value = null
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
    infoLoaded: infoCacheHolder.value !== null,
  }
}
