import { parse } from 'node-html-parser'
import type {
  BandwidthSpec,
  EC2EBSSpec,
  EC2InstanceDetails,
  EC2InstanceStoreSpec,
  EC2NetworkSpec,
  EC2SecuritySpec,
  ElastiCacheNodeDetails,
  RDSInstanceDetails,
  VolumeLimitSpec,
} from './types.js'

// === Configuration ===

export const EC2_CATEGORIES: Record<string, string> = {
  general_purpose:
    'https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html',
  compute_optimized:
    'https://docs.aws.amazon.com/ec2/latest/instancetypes/co.html',
  memory_optimized:
    'https://docs.aws.amazon.com/ec2/latest/instancetypes/mo.html',
  storage_optimized:
    'https://docs.aws.amazon.com/ec2/latest/instancetypes/so.html',
  accelerated_computing:
    'https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html',
  hpc: 'https://docs.aws.amazon.com/ec2/latest/instancetypes/hpc.html',
}

export const RDS_URL =
  'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.Summary.html'

export const ELASTICACHE_URL =
  'https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheNodes.SupportedTypes.html'

export const RDS_CATEGORIES = [
  'general_purpose',
  'memory_optimized',
  'compute_optimized',
  'burstable_performance',
]

export const ELASTICACHE_CATEGORIES = [
  'general_purpose',
  'memory_optimized',
  'network_optimized',
  'burstable_performance',
]

// === Text Cleaning ===

function cleanText(text: string): string {
  // Remove non-ASCII and clean whitespace
  const cleaned = text.replace(/[^\u0020-\u007E]/g, '')
  return cleaned.replace(/\s+/g, ' ').trim()
}

function cleanInstanceType(instanceType: string): string {
  return instanceType.replace(
    /(\d*xlarge|metal(?:-\d+xl)?|nano|micro|small|medium|large)\d+$/,
    '$1',
  )
}

function cleanHypervisor(hypervisor: string): string {
  return hypervisor.replace(/\s*[*]+\s*$/, '').trim()
}

function cleanOperatingSystem(osValue: string | string[]): string[] {
  function cleanSingle(val: string): string {
    let s = val.replace(/\d+$/, '')
    s = s.replace(/\s*\([^)]*\)\s*$/, '')
    return s.trim()
  }
  if (typeof osValue === 'string') return [cleanSingle(osValue)]
  return osValue.map(cleanSingle)
}

function toSnakeCase(text: string): string {
  let t = text.replace(/[().]/g, '')
  t = t.replace(/\//g, '_')
  t = t.replace(/[\s-]+/g, '_')
  t = t.toLowerCase()
  t = t.replace(/_+/g, '_')
  return t.replace(/^_|_$/g, '')
}

// === Value Parsing ===

type BasicValue = string | number | boolean | string[]

function parseBasicValue(value: string): BasicValue {
  if (!value) return value
  if (value.toLowerCase() === 'yes') return true
  if (value.toLowerCase() === 'no') return false
  if (value.includes('|')) {
    return value
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }
  if (value.includes('.')) {
    const f = Number.parseFloat(value)
    if (!Number.isNaN(f) && String(f) === value) return f
  } else {
    const i = Number.parseInt(value, 10)
    if (!Number.isNaN(i) && String(i) === value) return i
  }
  return value
}

function parseBandwidth(value: string | number): BandwidthSpec | string {
  if (typeof value === 'number') {
    return { baseline: value, burst: null }
  }
  if (typeof value !== 'string') {
    return { baseline: null, burst: null }
  }
  // Handle "X / Y" format (not Gigabit descriptive strings)
  if (value.includes('/') && !value.includes('Gigabit')) {
    const parts = value.split('/')
    if (parts.length === 2) {
      const part0 = parts[0] ?? ''
      const part1 = parts[1] ?? ''
      const baseline = Number.parseFloat(part0.trim())
      const burst = Number.parseFloat(part1.trim())
      if (!Number.isNaN(baseline) && !Number.isNaN(burst)) {
        return { baseline, burst }
      }
    }
  }
  return value
}

function parseVolumeLimit(value: string): VolumeLimitSpec | string {
  if (typeof value !== 'string') return value
  const match = value.match(
    /(?:Up to\s+)?(\d+)\s*\((\w+)(?:[- ]based)?\s*limit\)/i,
  )
  if (match) {
    const limitStr = match[1] ?? ''
    const limitType = match[2] ?? ''
    if (limitStr && limitType) {
      return {
        limit: Number.parseInt(limitStr, 10),
        limitType: limitType.toLowerCase(),
      }
    }
  }
  return value
}

function parseIops(value: string): [string, string] {
  if (typeof value !== 'string' || !value.includes('/')) {
    return [value ?? '', '']
  }
  const parts = value.split('/')
  const part0 = parts[0] ?? ''
  const part1 = parts[1] ?? ''
  if (parts.length === 2) {
    return [part0.trim(), part1.trim()]
  }
  return [value, '']
}

// === Family Extraction ===

export function extractFamilyFromInstanceType(instanceType: string): string {
  const parts = instanceType.split('.')
  const familyPart = parts[0] ?? instanceType
  if (!familyPart) return instanceType
  return familyPart.charAt(0).toUpperCase() + familyPart.slice(1)
}

export function extractRDSFamily(instanceClass: string): string {
  if (instanceClass.startsWith('db.')) {
    const parts = instanceClass.slice(3).split('.')
    const first = parts[0]
    if (first) return first.charAt(0).toUpperCase() + first.slice(1)
  }
  return instanceClass
}

export function extractElastiCacheFamily(nodeType: string): string {
  if (nodeType.startsWith('cache.')) {
    const parts = nodeType.slice(6).split('.')
    const first = parts[0]
    if (first) return first.charAt(0).toUpperCase() + first.slice(1)
  }
  return nodeType
}

// === Category Determination ===

export function determineRDSCategory(family: string): string {
  const f = family.toLowerCase()
  if (f.startsWith('t')) return 'burstable_performance'
  if (f.startsWith('r') || f.startsWith('x') || f.startsWith('z'))
    return 'memory_optimized'
  if (f.startsWith('c')) return 'compute_optimized'
  return 'general_purpose'
}

export function determineElastiCacheCategory(family: string): string {
  const f = family.toLowerCase()
  if (f.startsWith('t')) return 'burstable_performance'
  if (f.startsWith('r')) return 'memory_optimized'
  if (f.startsWith('c')) return 'network_optimized'
  return 'general_purpose'
}

// === HTML Table Parsing ===

type RawRow = Record<string, BasicValue>

function parseTable(tableHtml: string): RawRow[] {
  const root = parse(tableHtml)
  const table = root.querySelector('table') ?? root

  // Extract headers from thead
  const headers: string[] = []
  const thead = table.querySelector('thead')
  if (thead) {
    for (const th of thead.querySelectorAll('th')) {
      headers.push(toSnakeCase(cleanText(th.text)))
    }
  }

  const rows: RawRow[] = []
  const tbody = table.querySelector('tbody') ?? table
  const trs = tbody.querySelectorAll('tr')
  for (let ri = 0; ri < trs.length; ri++) {
    const tr = trs[ri]
    if (!tr) continue
    const cells = tr.querySelectorAll('td')
    if (!cells.length) continue

    const rowData: RawRow = {}
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      if (!cell) continue
      let value: BasicValue = cleanText(cell.text)
      value = parseBasicValue(value as string)

      const header =
        i < headers.length ? (headers[i] ?? `column_${i}`) : `column_${i}`

      if (header === 'instance_type' && typeof value === 'string') {
        value = cleanInstanceType(value)
      } else if (header === 'hypervisor' && typeof value === 'string') {
        value = cleanHypervisor(value)
      } else if (header === 'supported_operating_systems') {
        value = cleanOperatingSystem(
          Array.isArray(value) ? value : String(value),
        )
      }

      rowData[header] = value
    }

    if (Object.keys(rowData).length > 1) {
      rows.push(rowData)
    }
  }

  return rows
}

// === EC2 Parsing ===

interface EC2CategoryPageData {
  instance_family_summary?: RawRow[]
  performance_specifications?: RawRow[]
  network_specifications?: RawRow[]
  ebs_specifications?: RawRow[]
  instance_store_specifications?: RawRow[]
  security_specifications?: RawRow[]
}

function parseCategoryPage(html: string): EC2CategoryPageData {
  const root = parse(html)
  const tables = root.querySelectorAll('table')

  const sectionNames: (string | null)[] = [
    null, // Skip first table (instance families and types list)
    'instance_family_summary',
    'performance_specifications',
    'network_specifications',
    'ebs_specifications',
    'instance_store_specifications',
    'security_specifications',
  ]

  const data: EC2CategoryPageData = {}
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i]
    if (!table) continue
    const sectionName = i < sectionNames.length ? sectionNames[i] : `table_${i}`
    if (!sectionName) continue
    const parsed = parseTable(table.outerHTML)
    if (parsed.length) {
      ;(data as Record<string, RawRow[]>)[sectionName] = parsed
    }
  }

  return data
}

function getRawStr(row: RawRow, key: string): string {
  const v = row[key]
  return v !== undefined && v !== null ? String(v) : ''
}

function getRawNum(row: RawRow, key: string, fallback: number): number {
  const v = row[key]
  if (typeof v === 'number') return v
  if (v !== undefined) {
    const n = Number.parseFloat(String(v))
    if (!Number.isNaN(n)) return n
  }
  return fallback
}

function getRawInt(row: RawRow, key: string, fallback: number): number {
  const v = row[key]
  if (typeof v === 'number') return Math.floor(v)
  if (v !== undefined) {
    const n = Number.parseInt(String(v), 10)
    if (!Number.isNaN(n)) return n
  }
  return fallback
}

function getRawBool(row: RawRow, key: string): boolean {
  return Boolean(row[key])
}

function getRawAny(row: RawRow, key: string): BasicValue | undefined {
  return row[key]
}

function buildNetworkSpec(raw: RawRow): EC2NetworkSpec {
  const bwRaw = getRawAny(raw, 'baseline_burst_bandwidth_gbps')
  const bwVal =
    typeof bwRaw === 'number'
      ? bwRaw
      : getRawStr(raw, 'baseline_burst_bandwidth_gbps')
  const enaRaw = getRawAny(raw, 'ena')
  return {
    bandwidthGbps: parseBandwidth(bwVal),
    efa: getRawBool(raw, 'efa'),
    ena: enaRaw !== undefined ? (enaRaw as boolean | string) : false,
    enaExpress: getRawBool(raw, 'ena_express'),
    networkCards: getRawInt(raw, 'network_cards', 1),
    maxInterfaces: getRawInt(raw, 'max_network_interfaces', 1),
    ipv4PerInterface: getRawInt(raw, 'ip_addresses_per_interface', 1),
    ipv6: getRawBool(raw, 'ipv6'),
  }
}

function buildEBSSpec(raw: RawRow): EC2EBSSpec {
  const bwMbpsRaw = getRawAny(raw, 'baseline_maximum_bandwidth_mbps')
  const bwMbpsVal =
    typeof bwMbpsRaw === 'number'
      ? bwMbpsRaw
      : getRawStr(raw, 'baseline_maximum_bandwidth_mbps')

  const throughputRaw = getRawAny(
    raw,
    'baseline_maximum_throughput_mb_s,_128_kib_i_o',
  )
  const throughputVal =
    typeof throughputRaw === 'number'
      ? throughputRaw
      : getRawStr(raw, 'baseline_maximum_throughput_mb_s,_128_kib_i_o')

  const iopsRaw = getRawAny(raw, 'baseline_maximum_iops_16_kib_i_o')
  const iopsVal =
    typeof iopsRaw === 'number'
      ? iopsRaw
      : getRawStr(raw, 'baseline_maximum_iops_16_kib_i_o')

  return {
    bandwidthMbps: parseBandwidth(bwMbpsVal),
    throughputMBps: parseBandwidth(throughputVal),
    iops: parseBandwidth(iopsVal),
    nvme: getRawBool(raw, 'nvme'),
    volumeLimit: parseVolumeLimit(getRawStr(raw, 'ebs_volume_limit')),
  }
}

function buildInstanceStoreSpec(raw: RawRow): EC2InstanceStoreSpec | null {
  if (!raw || Object.keys(raw).length === 0) return null

  const [readIOPS, writeIOPS] = parseIops(
    getRawStr(raw, '100%_random_read_iops_write_iops'),
  )

  let needsInit: boolean | null = null
  const ni = getRawAny(raw, 'needs_initialization1')
  if (ni !== undefined && ni !== '' && ni !== null) needsInit = Boolean(ni)

  let trimSupport: boolean | null = null
  const ts = getRawAny(raw, 'trim_support2')
  if (ts !== undefined && ts !== '' && ts !== null) trimSupport = Boolean(ts)

  return {
    volumes: getRawStr(raw, 'instance_store_volumes'),
    storeType: getRawStr(raw, 'instance_store_type'),
    readIOPS,
    writeIOPS,
    needsInit,
    trimSupport,
  }
}

function buildSecuritySpec(raw: RawRow): EC2SecuritySpec {
  const ise = getRawAny(raw, 'instance_store_encryption')
  let instanceStoreEncryption: boolean | string | null = null
  if (ise !== undefined && ise !== null) {
    if (ise === 'Instance store not supported') {
      instanceStoreEncryption = null
    } else {
      instanceStoreEncryption = ise as boolean | string
    }
  }
  return {
    ebsEncryption: getRawBool(raw, 'ebs_encryption'),
    instanceStoreEncryption,
    encryptionInTransit: getRawBool(raw, 'encryption_in_transit'),
    amdSEVSNP: getRawBool(raw, 'amd_sev_snp'),
    nitroTPM: getRawBool(raw, 'nitrotpm'),
    nitroEnclaves: getRawBool(raw, 'nitro_enclaves'),
  }
}

function processCategoryData(
  rawData: EC2CategoryPageData,
  category: string,
): EC2InstanceDetails[] {
  // Build lookup tables
  const familySummaries: Record<string, RawRow> = {}
  for (const item of rawData.instance_family_summary ?? []) {
    const family = getRawAny(item, 'instance_family')
    if (family && typeof family === 'string') {
      familySummaries[family] = item
    }
  }

  const performance: Record<string, RawRow> = {}
  for (const item of rawData.performance_specifications ?? []) {
    const it = getRawAny(item, 'instance_type')
    if (it && typeof it === 'string') performance[it] = item
  }

  const network: Record<string, RawRow> = {}
  for (const item of rawData.network_specifications ?? []) {
    const it = getRawAny(item, 'instance_type')
    if (it && typeof it === 'string') network[it] = item
  }

  const ebs: Record<string, RawRow> = {}
  for (const item of rawData.ebs_specifications ?? []) {
    const it = getRawAny(item, 'instance_type')
    if (it && typeof it === 'string') ebs[it] = item
  }

  const instanceStore: Record<string, RawRow> = {}
  for (const item of rawData.instance_store_specifications ?? []) {
    const it = getRawAny(item, 'instance_type')
    if (it && typeof it === 'string') instanceStore[it] = item
  }

  const security: Record<string, RawRow> = {}
  for (const item of rawData.security_specifications ?? []) {
    const it = getRawAny(item, 'instance_type')
    if (it && typeof it === 'string') security[it] = item
  }

  const instances: EC2InstanceDetails[] = []

  for (const instanceType of Object.keys(performance)) {
    let familyName = extractFamilyFromInstanceType(instanceType)
    let familySummary = familySummaries[familyName] ?? null

    // Try case-insensitive match if not found
    if (!familySummary) {
      for (const [fname, fsummary] of Object.entries(familySummaries)) {
        if (fname.toLowerCase() === familyName.toLowerCase()) {
          familySummary = fsummary
          familyName = fname
          break
        }
      }
    }

    if (!familySummary) familySummary = {}

    const perf = performance[instanceType] ?? {}
    const netRaw = network[instanceType] ?? {}
    const ebsRaw = ebs[instanceType] ?? {}
    const storeRaw = instanceStore[instanceType] ?? null
    const secRaw = security[instanceType] ?? {}

    // Operating systems
    let operatingSystems: string[] = []
    const osValue = getRawAny(familySummary, 'supported_operating_systems')
    if (Array.isArray(osValue)) {
      operatingSystems = osValue.map(String)
    } else if (typeof osValue === 'string') {
      operatingSystems = cleanOperatingSystem(osValue)
    }

    // Accelerators
    let accelerators: string | null = null
    const acc = getRawAny(perf, 'accelerators')
    if (acc !== false && acc !== '' && acc !== undefined && acc !== null) {
      accelerators = String(acc)
    }

    let acceleratorMemory: string | null = null
    const am = getRawAny(perf, 'accelerator_memory')
    if (am !== false && am !== '' && am !== undefined && am !== null) {
      acceleratorMemory = String(am)
    }

    instances.push({
      instanceType,
      family: familyName,
      category,
      hypervisor: getRawStr(familySummary, 'hypervisor'),
      processorArchitecture: getRawStr(
        familySummary,
        'processor_type_architecture',
      ),
      metalAvailable: getRawBool(familySummary, 'metal_instances_available'),
      dedicatedHosts: getRawBool(familySummary, 'dedicated_hosts_support'),
      spot: getRawBool(familySummary, 'spot_support'),
      hibernation: getRawBool(familySummary, 'hibernation_support'),
      operatingSystems,
      memoryGiB: getRawNum(perf, 'memory_gib', 0),
      processor: getRawStr(perf, 'processor'),
      vCPUs: getRawInt(perf, 'vcpus', 0),
      cpuCores: getRawInt(perf, 'cpu_cores', 0),
      threadsPerCore: getRawInt(perf, 'threads_per_core', 1),
      accelerators,
      acceleratorMemory,
      network: buildNetworkSpec(netRaw),
      ebs: buildEBSSpec(ebsRaw),
      instanceStore: storeRaw ? buildInstanceStoreSpec(storeRaw) : null,
      security: buildSecuritySpec(secRaw),
    })
  }

  return instances
}

// === RDS Parsing ===

function parseRDSTable(tableHtml: string): RawRow[] {
  const root = parse(tableHtml)
  const table = root.querySelector('table') ?? root

  const headers: string[] = []
  const thead = table.querySelector('thead')
  if (thead) {
    for (const th of thead.querySelectorAll('th')) {
      headers.push(toSnakeCase(cleanText(th.text)))
    }
  }

  const rows: RawRow[] = []
  const tbody = table.querySelector('tbody') ?? table
  const trs = tbody.querySelectorAll('tr')
  for (let ri = 0; ri < trs.length; ri++) {
    const tr = trs[ri]
    if (!tr) continue
    const cells = tr.querySelectorAll('td')
    if (!cells.length) continue

    const rowData: RawRow = {}
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      if (!cell) continue
      let value: BasicValue = cleanText(cell.text)
      const header =
        i < headers.length ? (headers[i] ?? `column_${i}`) : `column_${i}`

      if (header === 'instance_class' && typeof value === 'string') {
        value = value.replace(/[*]+$/, '').trim()
      }
      rowData[header] = value
    }

    if (getRawAny(rowData, 'instance_class')) {
      rows.push(rowData)
    }
  }

  return rows
}

function processRDSData(rawInstances: RawRow[]): RDSInstanceDetails[] {
  const instances: RDSInstanceDetails[] = []

  for (const raw of rawInstances) {
    const instanceClass = getRawStr(raw, 'instance_class')
    if (!instanceClass || !instanceClass.startsWith('db.')) continue

    const family = extractRDSFamily(instanceClass)
    const category = determineRDSCategory(family)

    const vcpusRaw = getRawStr(raw, 'vcpu') || getRawStr(raw, 'vcpus') || '0'
    const vCPUs = Number.parseInt(vcpusRaw, 10) || 0

    const memRawStr = (
      getRawStr(raw, 'memory_gib') ||
      getRawStr(raw, 'memory') ||
      '0'
    ).replace(/,/g, '')
    const memoryGiB = Number.parseFloat(memRawStr) || 0

    const networkBandwidthGbps =
      getRawStr(raw, 'network_bandwidth_gbps') ||
      getRawStr(raw, 'network_bandwidth')
    const ebsBandwidthMbps =
      getRawStr(raw, 'max_ebs_bandwidth_mbps') ||
      getRawStr(raw, 'ebs_bandwidth')

    instances.push({
      instanceClass,
      family,
      category,
      vCPUs,
      memoryGiB,
      networkBandwidthGbps,
      ebsBandwidthMbps,
    })
  }

  return instances
}

// === ElastiCache Parsing ===

function parseElastiCacheTable(tableHtml: string): RawRow[] {
  const root = parse(tableHtml)
  const table = root.querySelector('table') ?? root

  const headers: string[] = []
  const thead = table.querySelector('thead')
  if (thead) {
    for (const th of thead.querySelectorAll('th')) {
      headers.push(toSnakeCase(cleanText(th.text)))
    }
  }

  const rows: RawRow[] = []
  const tbody = table.querySelector('tbody') ?? table
  const trs = tbody.querySelectorAll('tr')
  for (let ri = 0; ri < trs.length; ri++) {
    const tr = trs[ri]
    if (!tr) continue
    const cells = tr.querySelectorAll('td')
    if (!cells.length) continue

    const rowData: RawRow = {}
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      if (!cell) continue
      let value: BasicValue = cleanText(cell.text)
      const header =
        i < headers.length ? (headers[i] ?? `column_${i}`) : `column_${i}`

      if (
        (header === 'node_type' || header === 'instance_type') &&
        typeof value === 'string'
      ) {
        value = value.replace(/[*]+$/, '').trim()
      }
      rowData[header] = value
    }

    const nodeType =
      getRawStr(rowData, 'node_type') || getRawStr(rowData, 'instance_type')
    if (nodeType.startsWith('cache.')) {
      rowData.node_type = nodeType
      rows.push(rowData)
    }
  }

  return rows
}

function processElastiCacheData(rawNodes: RawRow[]): ElastiCacheNodeDetails[] {
  const seen = new Set<string>()
  const nodes: ElastiCacheNodeDetails[] = []

  for (const raw of rawNodes) {
    const nodeType = getRawStr(raw, 'node_type')
    if (!nodeType || !nodeType.startsWith('cache.')) continue
    if (seen.has(nodeType)) continue
    seen.add(nodeType)

    const family = extractElastiCacheFamily(nodeType)
    const category = determineElastiCacheCategory(family)

    let vCPUs: number | null = null
    const vcpusStr = getRawStr(raw, 'vcpus') || getRawStr(raw, 'vcpu')
    if (vcpusStr) {
      const parsed = Number.parseInt(vcpusStr, 10)
      if (!Number.isNaN(parsed)) vCPUs = parsed
    }

    let memoryGiB: number | null = null
    const memStr = (
      getRawStr(raw, 'memory_gib') || getRawStr(raw, 'memory')
    ).replace(/,/g, '')
    if (memStr) {
      const parsed = Number.parseFloat(memStr)
      if (!Number.isNaN(parsed)) memoryGiB = parsed
    }

    const networkPerformance = getRawStr(raw, 'network_performance')

    const baselineStr =
      getRawStr(raw, 'baseline_bandwidth_gbps') ||
      getRawStr(raw, 'baseline_gbps')
    const burstStr =
      getRawStr(raw, 'burst_bandwidth_gbps') || getRawStr(raw, 'burst_gbps')

    nodes.push({
      nodeType,
      family,
      category,
      vCPUs,
      memoryGiB,
      networkPerformance,
      baselineBandwidthGbps: baselineStr || null,
      burstBandwidthGbps: burstStr || null,
    })
  }

  return nodes
}

// === HTTP Fetch ===

async function fetchHTML(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch AWS docs: ${url} (status: ${res.status})`)
  }
  return res.text()
}

// === Public API ===

/**
 * Fetch and parse all EC2 instances for a specific category.
 */
export async function fetchEC2Category(
  category: string,
  url: string,
): Promise<EC2InstanceDetails[]> {
  const html = await fetchHTML(url)
  const rawData = parseCategoryPage(html)
  return processCategoryData(rawData, category)
}

/**
 * Fetch and parse all EC2 instances across all categories.
 */
export async function fetchAllEC2(): Promise<EC2InstanceDetails[]> {
  const results = await Promise.all(
    Object.entries(EC2_CATEGORIES).map(([category, url]) =>
      fetchEC2Category(category, url),
    ),
  )
  return results.flat()
}

/**
 * Fetch and parse all RDS instance classes.
 */
export async function fetchRDSInstances(): Promise<RDSInstanceDetails[]> {
  const html = await fetchHTML(RDS_URL)
  const root = parse(html)
  const tables = root.querySelectorAll('table')
  const allRows: RawRow[] = []
  for (const table of tables) {
    allRows.push(...parseRDSTable(table.outerHTML))
  }
  return processRDSData(allRows)
}

/**
 * Fetch and parse all ElastiCache node types.
 */
export async function fetchElastiCacheNodes(): Promise<
  ElastiCacheNodeDetails[]
> {
  const html = await fetchHTML(ELASTICACHE_URL)
  const root = parse(html)
  const tables = root.querySelectorAll('table')
  const allRows: RawRow[] = []
  for (const table of tables) {
    allRows.push(...parseElastiCacheTable(table.outerHTML))
  }
  return processElastiCacheData(allRows)
}
