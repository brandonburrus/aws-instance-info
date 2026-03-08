# V2 Refactor Plan: Runtime AWS Instance Info

## Goal

Replace the build-time data generation pipeline (Python `scripts/generate.py` + 1400+ JSON files in `data/`) with runtime HTML scraping of AWS documentation pages. Uses `make-synchronous` to provide both a sync and async API. Eliminates all generated types — identifiers become `string`.

---

## What Gets Deleted

| What | Why |
|---|---|
| `data/` (1400+ JSON files) | Replaced by runtime fetch from AWS docs |
| `scripts/` (generate.py + Python tooling) | No longer needed |
| `lib/types.ts` union types | `EC2InstanceType`, `EC2InstanceFamily`, etc. → `string` |
| `lib/*.cache.ts` (3 files) | State merged into `*.async.ts` modules |
| `tests/data-snapshots.test.ts` | No data files to snapshot |

---

## New Architecture

```
lib/
  types.ts              # Hand-written interfaces only (no union types)
  constants.ts          # Cache sizes (unchanged)
  fetch.ts              # Core HTTP fetch + HTML parsing (ported from generate.py)
  ec2.async.ts          # Async EC2 API with LRU caching (cache state inlined)
  rds.async.ts          # Async RDS API with LRU caching
  elasticache.async.ts  # Async ElastiCache API with LRU caching
  ec2.ts                # Sync EC2 API via make-synchronous
  rds.ts                # Sync RDS API via make-synchronous
  elasticache.ts        # Sync ElastiCache API via make-synchronous
  index.ts              # Re-exports sync API + types
  index.async.ts        # Re-exports async API + types
```

---

## Phase 1: `lib/types.ts` — Simplify to Interfaces Only

Remove all generated union types. Every place that had a union type becomes `string`.

**Before:**
```ts
export type EC2InstanceType = "m5.large" | "m5.xlarge" | ...;  // 1000+ values
export type EC2InstanceFamily = "M5" | "C5" | ...;             // 150+ values
```

**After:** (these types deleted entirely — callers use `string`)

Keep all structural interfaces (`EC2InstanceDetails`, `EC2FamilyData`, `EC2Info`, `BandwidthSpec`, `VolumeLimitSpec`, etc.) exactly as-is but replace union type references with `string`:

```ts
export interface EC2InstanceDetails {
  instanceType: string   // was EC2InstanceType
  family: string         // was EC2InstanceFamily
  category: string       // was EC2Category
  hypervisor: string     // was EC2Hypervisor
  processorArchitecture: string  // was EC2ProcessorArchitecture
  // ... all other fields identical
}

export interface EC2Info {
  families: string[]
  instances: string[]
  categories: string[]
}
```

---

## Phase 2: `lib/fetch.ts` — HTTP + HTML Parsing

Port all parsing logic from `scripts/generate.py` into TypeScript.

**Runtime dependencies added:**
- Native `fetch` (Node 18+, no package needed)
- `node-html-parser` — lightweight HTML parser, replaces BeautifulSoup

**AWS Documentation URLs** (same as in `generate.py`):
```
EC2 general_purpose:       https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html
EC2 compute_optimized:     https://docs.aws.amazon.com/ec2/latest/instancetypes/co.html
EC2 memory_optimized:      https://docs.aws.amazon.com/ec2/latest/instancetypes/mo.html
EC2 storage_optimized:     https://docs.aws.amazon.com/ec2/latest/instancetypes/so.html
EC2 accelerated_computing: https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html
EC2 hpc:                   https://docs.aws.amazon.com/ec2/latest/instancetypes/hpc.html
RDS:                       https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.Summary.html
ElastiCache:               https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheNodes.SupportedTypes.html
```

**Exported functions:**
```ts
export async function fetchEC2Category(category: string, url: string): Promise<EC2InstanceDetails[]>
export async function fetchAllEC2(): Promise<EC2InstanceDetails[]>
export async function fetchRDSInstances(): Promise<RDSInstanceDetails[]>
export async function fetchElastiCacheNodes(): Promise<ElastiCacheNodeDetails[]>
```

**Error behavior:** throws `Error: Failed to fetch AWS docs: <url> (status: 404)` on HTTP failure.

**Parsing logic** ported directly from `generate.py`:
- `cleanText()` / `cleanInstanceType()` / `cleanHypervisor()` text cleaners
- `parseTable()` generic HTML table → `Record<string, unknown>[]`
- `parseBandwidth()` / `parseVolumeLimit()` value parsers
- `buildNetworkSpec()` / `buildEBSSpec()` / `buildSecuritySpec()` etc.
- `extractFamilyFromInstanceType()` — `"m5.large"` → `"M5"`
- `determineRDSCategory()` / `determineElastiCacheCategory()` — family prefix logic

---

## Phase 3: `lib/ec2.async.ts` (and rds, elasticache)

Merge cache state in-line (no separate `*.cache.ts`). Replace `readFileSync` / `loadJson` with fetch calls.

**Key behavioral change — lazy bulk fetch:**
- First call to any EC2 function triggers a fetch of **all 6 EC2 category pages**
- The parsed `EC2InstanceDetails[]` is stored in an LRU cache keyed by instance type
- `getEC2Info()` builds the families/instances/categories manifest from the cached instance data
- `getEC2Family('M5')` filters cached instances where `instance.family === 'M5'`
- Subsequent calls hit the in-memory LRU cache — zero network I/O

Cache stats and clear functions remain identical.

---

## Phase 4: `lib/ec2.ts` — Sync Wrappers via `make-synchronous`

`make-synchronous` runs functions in an isolated worker thread. Variables and imports from the outer scope are **not** accessible — dependencies must be `await import()`-ed inside the worker closure.

```ts
import makeSynchronous from 'make-synchronous'
import type { EC2InstanceDetails, EC2FamilyData, EC2Info } from './types.js'

export const getEC2InstanceInfo = makeSynchronous(async (instanceType: string): Promise<EC2InstanceDetails> => {
  const { getEC2InstanceInfo } = await import('./ec2.async.js')
  return getEC2InstanceInfo(instanceType)
})
```

**Cache behavior:** The worker thread reuses its module scope across calls (make-synchronous v2.x reuses the worker), so the LRU cache in the async module **persists** between sync calls within the same process. This matches expected caching behavior.

**Cache clear/stats:** These are simple synchronous operations on the in-process LRU cache — they do NOT go through `make-synchronous`. They interact with the *worker thread's* cache state, not the main thread's. This is acceptable since the worker is where all data lives.

---

## Phase 5: `package.json` Changes

```json
{
  "engines": { "node": ">=18.0.0" },
  "files": ["dist", "README.md", "LICENSE"],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./async": {
      "import": "./dist/index.async.js",
      "types": "./dist/index.async.d.ts"
    }
  },
  "dependencies": {
    "lru-cache": "^11.x",
    "make-synchronous": "^2.1.0",
    "node-html-parser": "^6.x"
  },
  "devDependencies": {
    "msw": "^2.x"
    // ... existing devDeps
  }
}
```

**Removed:**
- `data/` from `"files"`
- `./data/ec2/*`, `./data/rds/*`, `./data/elasticache/*` from `"exports"`
- `generate` from `"scripts"`

---

## Phase 6: `tsconfig.json` Changes

Remove `"lib/**/*.json"` from `"include"` (no more JSON imports in lib/).

---

## Phase 7: Test Suite Rewrite

**Deleted:** `tests/data-snapshots.test.ts`

**New approach:** MSW (`msw/node`) intercepts `fetch` calls and serves fixture HTML.

```
tests/
  fixtures/
    ec2-general_purpose.html      # Saved from AWS docs
    ec2-compute_optimized.html
    ec2-memory_optimized.html
    ec2-storage_optimized.html
    ec2-accelerated_computing.html
    ec2-hpc.html
    rds.html
    elasticache.html
  setup.ts                        # MSW server setup
  ec2.test.ts                     # Rewritten
  ec2.async.test.ts               # Rewritten
  rds.test.ts                     # Rewritten
  rds.async.test.ts               # Rewritten
  elasticache.test.ts             # Rewritten
  elasticache.async.test.ts       # Rewritten
  fetch.test.ts                   # NEW: unit tests for fetch.ts parsing
  constants.test.ts               # Unchanged
```

**Test coverage:**
- Correct parsing of known HTML fixture structures
- LRU caching behavior (data fetched once, subsequent calls hit cache)
- Error handling when fetch fails (descriptive error message)
- Batch operations (`getEC2Instances([...])`)
- Sync wrappers return correct data
- `isValid*` functions return correct results
- `clearXxxCache()` resets cache state
- `getXxxCacheStats()` returns accurate counts

---

## What Stays the Same

- All public function signatures and names
- All JSDoc comments
- LRU cache infrastructure (`lru-cache`) and env-var cache sizing
- `aws-instance-info/async` export path
- `clearXxxCache()` / `getXxxCacheStats()` functions
- `constants.ts` — cache size env vars

---

## Node.js Version Requirement

Bumped from `>=16.0.0` to `>=18.0.0` — required for native `fetch` API.
