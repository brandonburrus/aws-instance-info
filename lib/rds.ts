import makeSynchronous from 'make-synchronous'

import type { RDSFamilyData, RDSInfo, RDSInstanceDetails } from './types.js'

// Re-export cache utilities directly — these operate on the async module's
// in-process state (the worker thread reuses its module scope).
export {
  clearRDSCache,
  getRDSCacheStats,
} from './rds.async.js'

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
// When the dist/rds.js runs:
//   import.meta.url = file:///path/dist/rds.js
//   asyncUrl        = file:///path/dist/rds.async.js  ← correct
// The worker then does:  await import("file:///path/dist/rds.async.js")  ← works
// ---------------------------------------------------------------------------

const _rdsAsyncUrl = new URL('./rds.async.js', import.meta.url).href

/** Create a makeSynchronous-compatible async function with the URL baked in. */
function makeWorkerFn<TArgs extends unknown[], TReturn>(
  body: (
    mod: Record<string, (...a: unknown[]) => Promise<unknown>>,
    ...args: TArgs
  ) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  // Embed the URL as a string literal so the worker is self-contained
  return new Function(`return async function(...args) {
    const mod = await import(${JSON.stringify(_rdsAsyncUrl)})
    return (${body.toString()})(mod, ...args)
  }`)() as (...args: TArgs) => Promise<TReturn>
}

/**
 * Get the RDS info manifest containing lists of all families and instance classes.
 * This is a lightweight call that can be used to enumerate available data.
 *
 * @returns RDSInfo object with families, instances, and categories arrays
 *
 * @example
 * ```typescript
 * import { getRDSInfo } from 'aws-instance-info'
 *
 * const info = getRDSInfo()
 * console.log(info.families) // ['M5', 'R6g', 'T3', ...]
 * console.log(info.instances) // ['db.m5.large', 'db.r6g.xlarge', ...]
 * console.log(info.categories) // ['general_purpose', 'memory_optimized', ...]
 * ```
 */
export const getRDSInfo = makeSynchronous(
  makeWorkerFn(async mod => (mod.getRDSInfo as () => Promise<RDSInfo>)()),
)

/**
 * Get detailed information for a specific RDS instance class.
 * Results are cached using LRU.
 *
 * @param instanceClass - The instance class (e.g., "db.m5.large")
 * @returns Instance class details including vCPUs, memory, network, and storage specs
 *
 * @example
 * ```typescript
 * import { getRDSInstanceInfo } from 'aws-instance-info'
 *
 * const instance = getRDSInstanceInfo('db.m5.large')
 * console.log(instance.instanceClass) // 'db.m5.large'
 * console.log(instance.vCPUs) // 2
 * console.log(instance.memoryGiB) // 8
 * console.log(instance.networkBandwidthGbps) // 'Up to 10'
 * ```
 */
export const getRDSInstanceInfo = makeSynchronous(
  makeWorkerFn(async (mod, instanceClass: string) =>
    (mod.getRDSInstanceInfo as (c: string) => Promise<RDSInstanceDetails>)(
      instanceClass,
    ),
  ),
)

/**
 * Get all data for an RDS instance family.
 * Includes the list of instance classes in the family. Results are cached using LRU.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Family data including category and instance class list
 *
 * @example
 * ```typescript
 * import { getRDSFamily } from 'aws-instance-info'
 *
 * const family = getRDSFamily('M5')
 * console.log(family.category) // 'general_purpose'
 * console.log(family.instanceClasses) // ['db.m5.large', 'db.m5.xlarge', ...]
 * ```
 */
export const getRDSFamily = makeSynchronous(
  makeWorkerFn(async (mod, family: string) =>
    (mod.getRDSFamily as (f: string) => Promise<RDSFamilyData>)(family),
  ),
)

/**
 * Get all instance classes belonging to a specific RDS family.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Array of instance class names in the family
 *
 * @example
 * ```typescript
 * import { getRDSFamilyInstanceClasses } from 'aws-instance-info'
 *
 * const classes = getRDSFamilyInstanceClasses('M5')
 * console.log(classes) // ['db.m5.large', 'db.m5.xlarge', 'db.m5.2xlarge', ...]
 * ```
 */
export const getRDSFamilyInstanceClasses = makeSynchronous(
  makeWorkerFn(async (mod, family: string) =>
    (mod.getRDSFamilyInstanceClasses as (f: string) => Promise<string[]>)(
      family,
    ),
  ),
)

/**
 * Get the category for an RDS instance family.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns The category (e.g., "general_purpose")
 *
 * @example
 * ```typescript
 * import { getRDSFamilyCategory } from 'aws-instance-info'
 *
 * const category = getRDSFamilyCategory('M5')
 * console.log(category) // 'general_purpose'
 *
 * const category2 = getRDSFamilyCategory('R6g')
 * console.log(category2) // 'memory_optimized'
 * ```
 */
export const getRDSFamilyCategory = makeSynchronous(
  makeWorkerFn(async (mod, family: string) =>
    (mod.getRDSFamilyCategory as (f: string) => Promise<string>)(family),
  ),
)

/**
 * Get all available RDS instance families.
 *
 * @returns Array of all family names
 *
 * @example
 * ```typescript
 * import { getAllRDSFamilies } from 'aws-instance-info'
 *
 * const families = getAllRDSFamilies()
 * console.log(families) // ['M5', 'M6g', 'M6i', 'R6g', 'R6i', 'T3', 'T4g', ...]
 * console.log(families.length) // ~40
 * ```
 */
export const getAllRDSFamilies = makeSynchronous(
  makeWorkerFn(async mod =>
    (mod.getAllRDSFamilies as () => Promise<string[]>)(),
  ),
)

/**
 * Get all available RDS instance classes.
 *
 * @returns Array of all instance class names
 *
 * @example
 * ```typescript
 * import { getAllRDSInstanceClasses } from 'aws-instance-info'
 *
 * const classes = getAllRDSInstanceClasses()
 * console.log(classes) // ['db.m5.large', 'db.m5.xlarge', 'db.r6g.2xlarge', ...]
 * console.log(classes.length) // ~350
 * ```
 */
export const getAllRDSInstanceClasses = makeSynchronous(
  makeWorkerFn(async mod =>
    (mod.getAllRDSInstanceClasses as () => Promise<string[]>)(),
  ),
)

/**
 * Get all available RDS categories.
 *
 * @returns Array of all category names
 *
 * @example
 * ```typescript
 * import { getAllRDSCategories } from 'aws-instance-info'
 *
 * const categories = getAllRDSCategories()
 * console.log(categories)
 * // ['general_purpose', 'memory_optimized', 'compute_optimized', 'burstable_performance']
 * ```
 */
export const getAllRDSCategories = makeSynchronous(
  makeWorkerFn(async mod =>
    (mod.getAllRDSCategories as () => Promise<string[]>)(),
  ),
)

/**
 * Check if an RDS instance class exists in the dataset.
 *
 * @param instanceClass - The instance class to check
 * @returns True if the instance class exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidRDSInstanceClass } from 'aws-instance-info'
 *
 * console.log(isValidRDSInstanceClass('db.m5.large')) // true
 * console.log(isValidRDSInstanceClass('db.m5.invalid')) // false
 * console.log(isValidRDSInstanceClass('db.t3.micro')) // true
 * ```
 */
export const isValidRDSInstanceClass = makeSynchronous(
  makeWorkerFn(async (mod, instanceClass: string) =>
    (mod.isValidRDSInstanceClass as (c: string) => Promise<boolean>)(
      instanceClass,
    ),
  ),
)

/**
 * Check if an RDS instance family exists in the dataset.
 *
 * @param family - The family name to check
 * @returns True if the family exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidRDSFamily } from 'aws-instance-info'
 *
 * console.log(isValidRDSFamily('M5')) // true
 * console.log(isValidRDSFamily('R6g')) // true
 * console.log(isValidRDSFamily('Invalid')) // false
 * ```
 */
export const isValidRDSFamily = makeSynchronous(
  makeWorkerFn(async (mod, family: string) =>
    (mod.isValidRDSFamily as (f: string) => Promise<boolean>)(family),
  ),
)

/**
 * Get multiple RDS instance classes at once. More efficient than calling
 * getRDSInstanceInfo multiple times for batch operations.
 *
 * @param instanceClasses - Array of instance classes to fetch
 * @returns Map of instance class to details
 *
 * @example
 * ```typescript
 * import { getRDSInstances } from 'aws-instance-info'
 *
 * const instances = getRDSInstances(['db.m5.large', 'db.m5.xlarge', 'db.r6g.2xlarge'])
 *
 * for (const [cls, details] of instances) {
 *   console.log(`${cls}: ${details.vCPUs} vCPUs, ${details.memoryGiB} GiB`)
 * }
 * // db.m5.large: 2 vCPUs, 8 GiB
 * // db.m5.xlarge: 4 vCPUs, 16 GiB
 * // db.r6g.2xlarge: 8 vCPUs, 64 GiB
 * ```
 */
export const getRDSInstances = makeSynchronous(
  makeWorkerFn(async (mod, instanceClasses: string[]) =>
    (
      mod.getRDSInstances as (
        cs: string[],
      ) => Promise<Map<string, RDSInstanceDetails>>
    )(instanceClasses),
  ),
)

/**
 * Get multiple RDS families at once. More efficient than calling getRDSFamily
 * multiple times for batch operations.
 *
 * @param families - Array of family names to fetch
 * @returns Map of family name to family data
 *
 * @example
 * ```typescript
 * import { getRDSFamilies } from 'aws-instance-info'
 *
 * const families = getRDSFamilies(['M5', 'R6g', 'T3'])
 *
 * for (const [name, data] of families) {
 *   console.log(`${name}: ${data.category}, ${data.instanceClasses.length} classes`)
 * }
 * // M5: general_purpose, 12 classes
 * // R6g: memory_optimized, 11 classes
 * // T3: burstable_performance, 8 classes
 * ```
 */
export const getRDSFamilies = makeSynchronous(
  makeWorkerFn(async (mod, families: string[]) =>
    (
      mod.getRDSFamilies as (
        fs: string[],
      ) => Promise<Map<string, RDSFamilyData>>
    )(families),
  ),
)
