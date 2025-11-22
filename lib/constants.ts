/**
 * Maximum number of EC2 instance details to cache in memory.
 *
 * This constant is derived from the `EC2_INSTANCE_CACHE_SIZE` environment variable.
 * If not set, defaults to 512.
 *
 * @example
 * ```typescript
 * // Use default size (512)
 * import { EC2_INSTANCE_CACHE_SIZE } from 'aws-instance-info'
 * console.log(EC2_INSTANCE_CACHE_SIZE) // 512
 *
 * // Or set via environment variable:
 * // EC2_INSTANCE_CACHE_SIZE=1024 node app.js
 * ```
 */
export const EC2_INSTANCE_CACHE_SIZE = Number.parseInt(
  process.env.EC2_INSTANCE_CACHE_SIZE ?? '512',
  10,
)

/**
 * Maximum number of EC2 family data objects to cache in memory.
 *
 * This constant is derived from the `EC2_FAMILY_CACHE_SIZE` environment variable.
 * If not set, defaults to 256.
 *
 * @example
 * ```typescript
 * // Use default size (256)
 * import { EC2_FAMILY_CACHE_SIZE } from 'aws-instance-info'
 * console.log(EC2_FAMILY_CACHE_SIZE) // 256
 *
 * // Or set via environment variable:
 * // EC2_FAMILY_CACHE_SIZE=512 node app.js
 * ```
 */
export const EC2_FAMILY_CACHE_SIZE = Number.parseInt(
  process.env.EC2_FAMILY_CACHE_SIZE ?? '256',
  10,
)

/**
 * Maximum number of RDS instance class details to cache in memory.
 *
 * This constant is derived from the `RDS_INSTANCE_CACHE_SIZE` environment variable.
 * If not set, defaults to 512.
 *
 * @example
 * ```typescript
 * // Use default size (512)
 * import { RDS_INSTANCE_CACHE_SIZE } from 'aws-instance-info'
 * console.log(RDS_INSTANCE_CACHE_SIZE) // 512
 *
 * // Or set via environment variable:
 * // RDS_INSTANCE_CACHE_SIZE=1024 node app.js
 * ```
 */
export const RDS_INSTANCE_CACHE_SIZE = Number.parseInt(
  process.env.RDS_INSTANCE_CACHE_SIZE ?? '512',
  10,
)

/**
 * Maximum number of RDS family data objects to cache in memory.
 *
 * This constant is derived from the `RDS_FAMILY_CACHE_SIZE` environment variable.
 * If not set, defaults to 256.
 *
 * @example
 * ```typescript
 * // Use default size (256)
 * import { RDS_FAMILY_CACHE_SIZE } from 'aws-instance-info'
 * console.log(RDS_FAMILY_CACHE_SIZE) // 256
 *
 * // Or set via environment variable:
 * // RDS_FAMILY_CACHE_SIZE=512 node app.js
 * ```
 */
export const RDS_FAMILY_CACHE_SIZE = Number.parseInt(
  process.env.RDS_FAMILY_CACHE_SIZE ?? '256',
  10,
)

/**
 * Maximum number of Elasticache node type details to cache in memory.
 *
 * This constant is derived from the `ELASTICACHE_NODE_CACHE_SIZE` environment variable.
 * If not set, defaults to 512.
 *
 * @example
 * ```typescript
 * // Use default size (512)
 * import { ELASTICACHE_NODE_CACHE_SIZE } from 'aws-instance-info'
 * console.log(ELASTICACHE_NODE_CACHE_SIZE) // 512
 *
 * // Or set via environment variable:
 * // ELASTICACHE_NODE_CACHE_SIZE=1024 node app.js
 * ```
 */
export const ELASTICACHE_NODE_CACHE_SIZE = Number.parseInt(
  process.env.ELASTICACHE_NODE_CACHE_SIZE ?? '512',
  10,
)

/**
 * Maximum number of Elasticache family data objects to cache in memory.
 *
 * This constant is derived from the `ELASTICACHE_FAMILY_CACHE_SIZE` environment variable.
 * If not set, defaults to 256.
 *
 * @example
 * ```typescript
 * // Use default size (256)
 * import { ELASTICACHE_FAMILY_CACHE_SIZE } from 'aws-instance-info'
 * console.log(ELASTICACHE_FAMILY_CACHE_SIZE) // 256
 *
 * // Or set via environment variable:
 * // ELASTICACHE_FAMILY_CACHE_SIZE=512 node app.js
 * ```
 */
export const ELASTICACHE_FAMILY_CACHE_SIZE = Number.parseInt(
  process.env.ELASTICACHE_FAMILY_CACHE_SIZE ?? '256',
  10,
)
