import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_DIR = join(__dirname, '..', 'data')

function loadJsonFile(filePath: string): unknown {
  const content = readFileSync(filePath, 'utf-8')
  return JSON.parse(content)
}

function getAllJsonFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllJsonFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath)
    }
  }

  return files.sort()
}

describe('EC2 Data Files', () => {
  const ec2Dir = join(DATA_DIR, 'ec2')
  const allFiles = getAllJsonFiles(ec2Dir)

  it('should have expected number of JSON files', () => {
    const fileList = allFiles.map(f => f.replace(`${DATA_DIR}/`, ''))
    expect(fileList).toMatchSnapshot('ec2-file-list')
  })

  it('should match snapshot for info.json', () => {
    const infoPath = join(ec2Dir, 'info.json')
    const data = loadJsonFile(infoPath)
    expect(data).toMatchSnapshot('ec2-info')
  })

  it('should match snapshots for all family files', () => {
    const familiesDir = join(ec2Dir, 'families')
    const familyFiles = readdirSync(familiesDir)
      .filter(f => f.endsWith('.json'))
      .sort()

    expect(familyFiles.length).toBeGreaterThan(0)

    for (const file of familyFiles) {
      const data = loadJsonFile(join(familiesDir, file))
      const familyName = file.replace('.json', '')
      expect(data).toMatchSnapshot(`ec2-family-${familyName}`)
    }
  })

  it('should match snapshots for all instance files', () => {
    const instancesDir = join(ec2Dir, 'instances')
    const instanceFiles = readdirSync(instancesDir)
      .filter(f => f.endsWith('.json'))
      .sort()

    expect(instanceFiles.length).toBeGreaterThan(0)

    for (const file of instanceFiles) {
      const data = loadJsonFile(join(instancesDir, file))
      const instanceName = file.replace('.json', '')
      expect(data).toMatchSnapshot(`ec2-instance-${instanceName}`)
    }
  })
})

describe('RDS Data Files', () => {
  const rdsDir = join(DATA_DIR, 'rds')
  const allFiles = getAllJsonFiles(rdsDir)

  it('should have expected number of JSON files', () => {
    const fileList = allFiles.map(f => f.replace(`${DATA_DIR}/`, ''))
    expect(fileList).toMatchSnapshot('rds-file-list')
  })

  it('should match snapshot for info.json', () => {
    const infoPath = join(rdsDir, 'info.json')
    const data = loadJsonFile(infoPath)
    expect(data).toMatchSnapshot('rds-info')
  })

  it('should match snapshots for all family files', () => {
    const familiesDir = join(rdsDir, 'families')
    const familyFiles = readdirSync(familiesDir)
      .filter(f => f.endsWith('.json'))
      .sort()

    expect(familyFiles.length).toBeGreaterThan(0)

    for (const file of familyFiles) {
      const data = loadJsonFile(join(familiesDir, file))
      const familyName = file.replace('.json', '')
      expect(data).toMatchSnapshot(`rds-family-${familyName}`)
    }
  })

  it('should match snapshots for all instance files', () => {
    const instancesDir = join(rdsDir, 'instances')
    const instanceFiles = readdirSync(instancesDir)
      .filter(f => f.endsWith('.json'))
      .sort()

    expect(instanceFiles.length).toBeGreaterThan(0)

    for (const file of instanceFiles) {
      const data = loadJsonFile(join(instancesDir, file))
      const instanceName = file.replace('.json', '')
      expect(data).toMatchSnapshot(`rds-instance-${instanceName}`)
    }
  })
})

describe('ElastiCache Data Files', () => {
  const elasticacheDir = join(DATA_DIR, 'elasticache')
  const allFiles = getAllJsonFiles(elasticacheDir)

  it('should have expected number of JSON files', () => {
    const fileList = allFiles.map(f => f.replace(`${DATA_DIR}/`, ''))
    expect(fileList).toMatchSnapshot('elasticache-file-list')
  })

  it('should match snapshot for info.json', () => {
    const infoPath = join(elasticacheDir, 'info.json')
    const data = loadJsonFile(infoPath)
    expect(data).toMatchSnapshot('elasticache-info')
  })

  it('should match snapshots for all family files', () => {
    const familiesDir = join(elasticacheDir, 'families')
    const familyFiles = readdirSync(familiesDir)
      .filter(f => f.endsWith('.json'))
      .sort()

    expect(familyFiles.length).toBeGreaterThan(0)

    for (const file of familyFiles) {
      const data = loadJsonFile(join(familiesDir, file))
      const familyName = file.replace('.json', '')
      expect(data).toMatchSnapshot(`elasticache-family-${familyName}`)
    }
  })

  it('should match snapshots for all node files', () => {
    const nodesDir = join(elasticacheDir, 'nodes')
    const nodeFiles = readdirSync(nodesDir)
      .filter(f => f.endsWith('.json'))
      .sort()

    expect(nodeFiles.length).toBeGreaterThan(0)

    for (const file of nodeFiles) {
      const data = loadJsonFile(join(nodesDir, file))
      const nodeName = file.replace('.json', '')
      expect(data).toMatchSnapshot(`elasticache-node-${nodeName}`)
    }
  })
})
