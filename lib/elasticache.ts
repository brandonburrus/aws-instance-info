import makeSynchronous from 'make-synchronous'

import type {
  ElastiCacheFamilyData,
  ElastiCacheInfo,
  ElastiCacheNodeDetails,
} from './types.js'

// Re-export cache utilities directly — these operate on the async module's
// in-process state (the worker thread reuses its module scope).
export {
  clearElastiCacheCache,
  getElastiCacheCacheStats,
} from './elasticache.async.js'

// ---------------------------------------------------------------------------
// Worker-safe dynamic import helper
// ---------------------------------------------------------------------------
// make-synchronous stringifies callback functions and runs them in a worker
// thread. Vite's SSR transform replaces import() with __vite_ssr_dynamic_import__
// which doesn't exist in worker thread contexts.
//
// Fix: pre-compute the absolute async-module URL from import.meta.url at
// module load time (tsc preserves import.meta.url; the dist file's URL gives
// the correct absolute path). Then embed that URL as a string literal inside
// the callback using new Function(), which Vite cannot inspect or transform.
//
// When the dist/elasticache.js runs:
//   import.meta.url = file:///path/dist/elasticache.js
//   asyncUrl        = file:///path/dist/elasticache.async.js  ← correct
// The worker then does:  await import("file:///path/dist/elasticache.async.js")  ← works
// ---------------------------------------------------------------------------

const _elasticacheAsyncUrl = new URL('./elasticache.async.js', import.meta.url)
  .href

/** Create a makeSynchronous-compatible async function with the URL baked in. */
function makeWorkerFn<TArgs extends unknown[], TReturn>(
  body: (
    mod: Record<string, (...a: unknown[]) => Promise<unknown>>,
    ...args: TArgs
  ) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  // Embed the URL as a string literal so the worker is self-contained
  return new Function(`return async function(...args) {
    const mod = await import(${JSON.stringify(_elasticacheAsyncUrl)})
    return (${body.toString()})(mod, ...args)
  }`)() as (...args: TArgs) => Promise<TReturn>
}

/**
 * Get the ElastiCache info manifest containing lists of all families and node types.
 * This is a lightweight call that can be used to enumerate available data.
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
export const getElastiCacheInfo = makeSynchronous(
  makeWorkerFn(async mod =>
    (mod.getElastiCacheInfo as () => Promise<ElastiCacheInfo>)(),
  ),
)

/**
 * Get detailed information for a specific ElastiCache node type.
 * Results are cached using LRU.
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
export const getElastiCacheNodeInfo = makeSynchronous(
  makeWorkerFn(async (mod, nodeType: string) =>
    (
      mod.getElastiCacheNodeInfo as (
        t: string,
      ) => Promise<ElastiCacheNodeDetails>
    )(nodeType),
  ),
)

/**
 * Get all data for an ElastiCache node family.
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
export const getElastiCacheFamily = makeSynchronous(
  makeWorkerFn(async (mod, family: string) =>
    (mod.getElastiCacheFamily as (f: string) => Promise<ElastiCacheFamilyData>)(
      family,
    ),
  ),
)

/**
 * Get all node types belonging to a specific ElastiCache family.
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
export const getElastiCacheFamilyNodeTypes = makeSynchronous(
  makeWorkerFn(async (mod, family: string) =>
    (mod.getElastiCacheFamilyNodeTypes as (f: string) => Promise<string[]>)(
      family,
    ),
  ),
)

/**
 * Get the category for an ElastiCache node family.
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
export const getElastiCacheFamilyCategory = makeSynchronous(
  makeWorkerFn(async (mod, family: string) =>
    (mod.getElastiCacheFamilyCategory as (f: string) => Promise<string>)(
      family,
    ),
  ),
)

/**
 * Get all available ElastiCache node families.
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
export const getAllElastiCacheFamilies = makeSynchronous(
  makeWorkerFn(async mod =>
    (mod.getAllElastiCacheFamilies as () => Promise<string[]>)(),
  ),
)

/**
 * Get all available ElastiCache node types.
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
export const getAllElastiCacheNodeTypes = makeSynchronous(
  makeWorkerFn(async mod =>
    (mod.getAllElastiCacheNodeTypes as () => Promise<string[]>)(),
  ),
)

/**
 * Get all available ElastiCache categories.
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
export const getAllElastiCacheCategories = makeSynchronous(
  makeWorkerFn(async mod =>
    (mod.getAllElastiCacheCategories as () => Promise<string[]>)(),
  ),
)

/**
 * Check if an ElastiCache node type exists in the dataset.
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
export const isValidElastiCacheNodeType = makeSynchronous(
  makeWorkerFn(async (mod, nodeType: string) =>
    (mod.isValidElastiCacheNodeType as (t: string) => Promise<boolean>)(
      nodeType,
    ),
  ),
)

/**
 * Check if an ElastiCache node family exists in the dataset.
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
export const isValidElastiCacheFamily = makeSynchronous(
  makeWorkerFn(async (mod, family: string) =>
    (mod.isValidElastiCacheFamily as (f: string) => Promise<boolean>)(family),
  ),
)

/**
 * Get multiple ElastiCache node types at once.
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
export const getElastiCacheNodes = makeSynchronous(
  makeWorkerFn(async (mod, nodeTypes: string[]) =>
    (
      mod.getElastiCacheNodes as (
        ts: string[],
      ) => Promise<Map<string, ElastiCacheNodeDetails>>
    )(nodeTypes),
  ),
)

/**
 * Get multiple ElastiCache families at once.
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
export const getElastiCacheFamilies = makeSynchronous(
  makeWorkerFn(async (mod, families: string[]) =>
    (
      mod.getElastiCacheFamilies as (
        fs: string[],
      ) => Promise<Map<string, ElastiCacheFamilyData>>
    )(families),
  ),
)
