// Hand-written interfaces only — no generated union types.
// All identifier fields (instanceType, family, category, etc.) use `string`.

// ============================================================
// EC2 Types
// ============================================================

// === EC2 Interfaces ===

export interface BandwidthSpec {
  baseline: number | null
  burst: number | null
}

export interface VolumeLimitSpec {
  limit: number
  limitType: string
}

export interface EC2NetworkSpec {
  bandwidthGbps: BandwidthSpec | string
  efa: boolean
  ena: boolean | string
  enaExpress: boolean
  networkCards: number
  maxInterfaces: number
  ipv4PerInterface: number
  ipv6: boolean
}

export interface EC2EBSSpec {
  bandwidthMbps: BandwidthSpec | string
  throughputMBps: BandwidthSpec | string
  iops: BandwidthSpec | string
  nvme: boolean
  volumeLimit: VolumeLimitSpec | string
}

export interface EC2InstanceStoreSpec {
  volumes: string
  storeType: string
  readIOPS: string
  writeIOPS: string
  needsInit: boolean | null
  trimSupport: boolean | null
}

export interface EC2SecuritySpec {
  ebsEncryption: boolean
  instanceStoreEncryption: boolean | string | null
  encryptionInTransit: boolean
  amdSEVSNP: boolean
  nitroTPM: boolean
  nitroEnclaves: boolean
}

export interface EC2InstanceDetails {
  instanceType: string
  family: string
  category: string
  // Flattened familySummary fields
  hypervisor: string
  processorArchitecture: string
  metalAvailable: boolean
  dedicatedHosts: boolean
  spot: boolean
  hibernation: boolean
  operatingSystems: string[]
  // Flattened performance fields
  memoryGiB: number
  processor: string
  vCPUs: number
  cpuCores: number
  threadsPerCore: number
  accelerators: string | null
  acceleratorMemory: string | null
  // Nested specs
  network: EC2NetworkSpec
  ebs: EC2EBSSpec
  instanceStore: EC2InstanceStoreSpec | null
  security: EC2SecuritySpec
}

export interface EC2FamilyData {
  family: string
  category: string
  instanceTypes: string[]
  hypervisor: string
  processorArchitecture: string
  metalAvailable: boolean
  dedicatedHosts: boolean
  spot: boolean
  hibernation: boolean
  operatingSystems: string[]
}

export interface EC2Info {
  families: string[]
  instances: string[]
  categories: string[]
}

// ============================================================
// RDS Types
// ============================================================

// === RDS Interfaces ===

export interface RDSInstanceDetails {
  instanceClass: string
  family: string
  category: string
  vCPUs: number
  memoryGiB: number
  networkBandwidthGbps: string
  ebsBandwidthMbps: string
}

export interface RDSFamilyData {
  family: string
  category: string
  instanceClasses: string[]
}

export interface RDSInfo {
  families: string[]
  instances: string[]
  categories: string[]
}

// ============================================================
// Elasticache Types
// ============================================================

// === Elasticache Interfaces ===

export interface ElastiCacheNodeDetails {
  nodeType: string
  family: string
  category: string
  vCPUs: number | null
  memoryGiB: number | null
  networkPerformance: string
  baselineBandwidthGbps: string | null
  burstBandwidthGbps: string | null
}

export interface ElastiCacheFamilyData {
  family: string
  category: string
  nodeTypes: string[]
}

export interface ElastiCacheInfo {
  families: string[]
  nodeTypes: string[]
  categories: string[]
}
