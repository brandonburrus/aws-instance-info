import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LRUCache } from 'lru-cache'

import { RDS_FAMILY_CACHE_SIZE, RDS_INSTANCE_CACHE_SIZE } from './constants.js'
import type { RDSFamilyData, RDSInfo, RDSInstanceDetails } from './types.js'

/* File Paths */
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** Base directory for RDS data files */
export const RDS_DATA_DIR = join(__dirname, '..', 'data', 'rds')

/* Internal Caches - shared between sync and async APIs */
export const instanceCache = new LRUCache<string, RDSInstanceDetails>({
  max: RDS_INSTANCE_CACHE_SIZE,
})
export const familyCache = new LRUCache<string, RDSFamilyData>({
  max: RDS_FAMILY_CACHE_SIZE,
})

/** Info cache wrapper to allow mutation */
export const infoCacheHolder: { value: RDSInfo | null } = { value: null }

/**
 * Clear all RDS cached data.
 * Useful for testing or when you need to free memory.
 *
 * @example
 * ```typescript
 * import { clearRDSCache, getRDSCacheStats } from 'aws-instance-info'
 *
 * console.log(getRDSCacheStats()) // { instances: 10, families: 3, infoLoaded: true }
 *
 * clearRDSCache()
 *
 * console.log(getRDSCacheStats()) // { instances: 0, families: 0, infoLoaded: false }
 * ```
 */
export function clearRDSCache(): void {
  instanceCache.clear()
  familyCache.clear()
  infoCacheHolder.value = null
}

/**
 * Get RDS cache statistics.
 * Useful for debugging or monitoring memory usage.
 *
 * @returns Object with cache statistics
 *
 * @example
 * ```typescript
 * import { getRDSCacheStats, getRDSInstanceInfo } from 'aws-instance-info'
 *
 * getRDSInstanceInfo('db.m5.large')
 * getRDSInstanceInfo('db.m5.xlarge')
 *
 * const stats = getRDSCacheStats()
 * console.log(stats)
 * // { instances: 2, families: 0, infoLoaded: true }
 * ```
 */
export function getRDSCacheStats(): {
  instances: number
  families: number
  infoLoaded: boolean
} {
  return {
    instances: instanceCache.size,
    families: familyCache.size,
    infoLoaded: infoCacheHolder.value !== null,
  }
}
