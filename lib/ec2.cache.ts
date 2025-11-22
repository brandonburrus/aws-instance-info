import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LRUCache } from 'lru-cache'

import { EC2_FAMILY_CACHE_SIZE, EC2_INSTANCE_CACHE_SIZE } from './constants.js'
import type { EC2FamilyData, EC2Info, EC2InstanceDetails } from './types.js'

/* File Paths */
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** Base directory for EC2 data files */
export const EC2_DATA_DIR = join(__dirname, '..', 'data', 'ec2')

/* Internal Caches - shared between sync and async APIs */
export const instanceCache = new LRUCache<string, EC2InstanceDetails>({
  max: EC2_INSTANCE_CACHE_SIZE,
})
export const familyCache = new LRUCache<string, EC2FamilyData>({
  max: EC2_FAMILY_CACHE_SIZE,
})

/** Info cache wrapper to allow mutation */
export const infoCacheHolder: { value: EC2Info | null } = { value: null }

/**
 * Clear all EC2 cached data.
 * Useful for testing or when you need to free memory.
 *
 * @example
 * ```typescript
 * import { clearEC2Cache, getEC2CacheStats } from 'aws-instance-info'
 *
 * console.log(getEC2CacheStats()) // { instances: 10, families: 3, infoLoaded: true }
 *
 * clearEC2Cache()
 *
 * console.log(getEC2CacheStats()) // { instances: 0, families: 0, infoLoaded: false }
 * ```
 */
export function clearEC2Cache(): void {
  instanceCache.clear()
  familyCache.clear()
  infoCacheHolder.value = null
}

/**
 * Get EC2 cache statistics.
 * Useful for debugging or monitoring memory usage.
 *
 * @returns Object with cache statistics
 *
 * @example
 * ```typescript
 * import { getEC2CacheStats, getEC2InstanceInfo } from 'aws-instance-info'
 *
 * getEC2InstanceInfo('m5.large')
 * getEC2InstanceInfo('m5.xlarge')
 *
 * const stats = getEC2CacheStats()
 * console.log(stats)
 * // { instances: 2, families: 0, infoLoaded: true }
 * ```
 */
export function getEC2CacheStats(): {
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
