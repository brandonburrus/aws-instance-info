import makeSynchronous from 'make-synchronous'

import type { EC2FamilyData, EC2Info, EC2InstanceDetails } from './types.js'

// Re-export cache utilities directly — these operate on the async module's
// in-process state (the worker thread reuses its module scope).
export {
  clearEC2Cache,
  getEC2CacheStats,
} from './ec2.async.js'

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
// When the dist/ec2.js runs:
//   import.meta.url = file:///path/dist/ec2.js
//   asyncUrl        = file:///path/dist/ec2.async.js  ← correct
// The worker then does:  await import("file:///path/dist/ec2.async.js")  ← works
// ---------------------------------------------------------------------------

const _ec2AsyncUrl = new URL('./ec2.async.js', import.meta.url).href

/** Create a makeSynchronous-compatible async function with the URL baked in. */
function makeWorkerFn<TArgs extends unknown[], TReturn>(
  body: (
    mod: Record<string, (...a: unknown[]) => Promise<unknown>>,
    ...args: TArgs
  ) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  // Embed the URL as a string literal so the worker is self-contained
  return new Function(`return async function(...args) {
    const mod = await import(${JSON.stringify(_ec2AsyncUrl)})
    return (${body.toString()})(mod, ...args)
  }`)() as (...args: TArgs) => Promise<TReturn>
}

/**
 * Get the EC2 info manifest containing lists of all families and instance types.
 * This is a lightweight call that can be used to enumerate available data.
 *
 * @returns EC2Info object with families, instances, and categories arrays
 *
 * @example
 * ```typescript
 * import { getEC2Info } from 'aws-instance-info'
 *
 * const info = getEC2Info()
 * console.log(info.families) // ['M5', 'C7', 'R6i', ...]
 * console.log(info.instances) // ['m5.large', 'c7.xlarge', ...]
 * console.log(info.categories) // ['general_purpose', 'compute_optimized', ...]
 * ```
 */
export const getEC2Info = makeSynchronous(
  makeWorkerFn(async mod => (mod.getEC2Info as () => Promise<EC2Info>)()),
)

/**
 * Get detailed information for a specific EC2 instance type.
 * Loads only the JSON file for the requested instance. Results are cached using LRU.
 *
 * @param instanceType - The instance type (e.g., "m5.large")
 * @returns Instance details including performance, networking, EBS, and security specs
 *
 * @example
 * ```typescript
 * import { getEC2InstanceInfo } from 'aws-instance-info'
 *
 * const instance = getEC2InstanceInfo('m5.large')
 * console.log(instance.instanceType) // 'm5.large'
 * console.log(instance.vCPUs) // 2
 * console.log(instance.memoryGiB) // 8
 * console.log(instance.hypervisor) // 'Nitro v2'
 * ```
 */
export const getEC2InstanceInfo = makeSynchronous(
  makeWorkerFn(async (mod, instanceType: string) =>
    (mod.getEC2InstanceInfo as (t: string) => Promise<EC2InstanceDetails>)(
      instanceType,
    ),
  ),
)

/**
 * Get all data for an EC2 instance family.
 * Includes the family metadata and list of instance types in the family.
 * Results are cached using LRU.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Family data including metadata and instance type list
 *
 * @example
 * ```typescript
 * import { getEC2Family } from 'aws-instance-info'
 *
 * const family = getEC2Family('M5')
 * console.log(family.category) // 'general_purpose'
 * console.log(family.instanceTypes) // ['m5.large', 'm5.xlarge', ...]
 * console.log(family.hypervisor) // 'Nitro v2'
 * console.log(family.processorArchitecture) // 'Intel (x86_64)'
 * ```
 */
export const getEC2Family = makeSynchronous(
  makeWorkerFn(async (mod, family: string) =>
    (mod.getEC2Family as (f: string) => Promise<EC2FamilyData>)(family),
  ),
)

/**
 * Get all instance types belonging to a specific EC2 family.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns Array of instance type names in the family
 *
 * @example
 * ```typescript
 * import { getEC2FamilyInstanceTypes } from 'aws-instance-info'
 *
 * const types = getEC2FamilyInstanceTypes('M5')
 * console.log(types) // ['m5.large', 'm5.xlarge', 'm5.2xlarge', ...]
 * ```
 */
export const getEC2FamilyInstanceTypes = makeSynchronous(
  makeWorkerFn(async (mod, family: string) =>
    (mod.getEC2FamilyInstanceTypes as (f: string) => Promise<string[]>)(family),
  ),
)

/**
 * Get the category for an EC2 instance family.
 *
 * @param family - The instance family (e.g., "M5")
 * @returns The category (e.g., "general_purpose")
 *
 * @example
 * ```typescript
 * import { getEC2FamilyCategory } from 'aws-instance-info'
 *
 * const category = getEC2FamilyCategory('M5')
 * console.log(category) // 'general_purpose'
 *
 * const category2 = getEC2FamilyCategory('C7')
 * console.log(category2) // 'compute_optimized'
 * ```
 */
export const getEC2FamilyCategory = makeSynchronous(
  makeWorkerFn(async (mod, family: string) =>
    (mod.getEC2FamilyCategory as (f: string) => Promise<string>)(family),
  ),
)

/**
 * Get all available EC2 instance families.
 *
 * @returns Array of all family names
 *
 * @example
 * ```typescript
 * import { getAllEC2Families } from 'aws-instance-info'
 *
 * const families = getAllEC2Families()
 * console.log(families) // ['M5', 'M5a', 'M5ad', 'M5d', 'C7', 'C7g', ...]
 * console.log(families.length) // ~150
 * ```
 */
export const getAllEC2Families = makeSynchronous(
  makeWorkerFn(async mod =>
    (mod.getAllEC2Families as () => Promise<string[]>)(),
  ),
)

/**
 * Get all available EC2 instance types.
 *
 * @returns Array of all instance type names
 *
 * @example
 * ```typescript
 * import { getAllEC2InstanceTypes } from 'aws-instance-info'
 *
 * const types = getAllEC2InstanceTypes()
 * console.log(types) // ['m5.large', 'm5.xlarge', 'c7.2xlarge', ...]
 * console.log(types.length) // ~1000
 * ```
 */
export const getAllEC2InstanceTypes = makeSynchronous(
  makeWorkerFn(async mod =>
    (mod.getAllEC2InstanceTypes as () => Promise<string[]>)(),
  ),
)

/**
 * Get all available EC2 categories.
 *
 * @returns Array of all category names
 *
 * @example
 * ```typescript
 * import { getAllEC2Categories } from 'aws-instance-info'
 *
 * const categories = getAllEC2Categories()
 * console.log(categories)
 * // ['general_purpose', 'compute_optimized', 'memory_optimized',
 * //  'storage_optimized', 'accelerated_computing', 'hpc']
 * ```
 */
export const getAllEC2Categories = makeSynchronous(
  makeWorkerFn(async mod =>
    (mod.getAllEC2Categories as () => Promise<string[]>)(),
  ),
)

/**
 * Check if an EC2 instance type exists in the dataset.
 *
 * @param instanceType - The instance type to check
 * @returns True if the instance type exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidEC2InstanceType } from 'aws-instance-info'
 *
 * console.log(isValidEC2InstanceType('m5.large')) // true
 * console.log(isValidEC2InstanceType('m5.invalid')) // false
 * console.log(isValidEC2InstanceType('t3.micro')) // true
 * ```
 */
export const isValidEC2InstanceType = makeSynchronous(
  makeWorkerFn(async (mod, instanceType: string) =>
    (mod.isValidEC2InstanceType as (t: string) => Promise<boolean>)(
      instanceType,
    ),
  ),
)

/**
 * Check if an EC2 instance family exists in the dataset.
 *
 * @param family - The family name to check
 * @returns True if the family exists, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidEC2Family } from 'aws-instance-info'
 *
 * console.log(isValidEC2Family('M5')) // true
 * console.log(isValidEC2Family('C7')) // true
 * console.log(isValidEC2Family('Invalid')) // false
 * ```
 */
export const isValidEC2Family = makeSynchronous(
  makeWorkerFn(async (mod, family: string) =>
    (mod.isValidEC2Family as (f: string) => Promise<boolean>)(family),
  ),
)

/**
 * Get multiple EC2 instances at once. More efficient than calling getEC2InstanceInfo
 * multiple times for batch operations.
 *
 * @param instanceTypes - Array of instance types to fetch
 * @returns Map of instance type to details
 *
 * @example
 * ```typescript
 * import { getEC2Instances } from 'aws-instance-info'
 *
 * const instances = getEC2Instances(['m5.large', 'm5.xlarge', 'c7.2xlarge'])
 *
 * for (const [type, details] of instances) {
 *   console.log(`${type}: ${details.vCPUs} vCPUs`)
 * }
 * // m5.large: 2 vCPUs
 * // m5.xlarge: 4 vCPUs
 * // c7.2xlarge: 8 vCPUs
 * ```
 */
export const getEC2Instances = makeSynchronous(
  makeWorkerFn(async (mod, instanceTypes: string[]) =>
    (
      mod.getEC2Instances as (
        ts: string[],
      ) => Promise<Map<string, EC2InstanceDetails>>
    )(instanceTypes),
  ),
)

/**
 * Get multiple EC2 families at once. More efficient than calling getEC2Family
 * multiple times for batch operations.
 *
 * @param families - Array of family names to fetch
 * @returns Map of family name to family data
 *
 * @example
 * ```typescript
 * import { getEC2Families } from 'aws-instance-info'
 *
 * const families = getEC2Families(['M5', 'C7', 'R6i'])
 *
 * for (const [name, data] of families) {
 *   console.log(`${name}: ${data.category}, ${data.instanceTypes.length} types`)
 * }
 * // M5: general_purpose, 24 types
 * // C7: compute_optimized, 12 types
 * // R6i: memory_optimized, 16 types
 * ```
 */
export const getEC2Families = makeSynchronous(
  makeWorkerFn(async (mod, families: string[]) =>
    (
      mod.getEC2Families as (
        fs: string[],
      ) => Promise<Map<string, EC2FamilyData>>
    )(families),
  ),
)
