import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FIXTURES_DIR = join(__dirname, 'fixtures')

function fixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8')
}

export const server = setupServer(
  http.get('https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html', () =>
    HttpResponse.html(fixture('ec2-general_purpose.html')),
  ),
  http.get('https://docs.aws.amazon.com/ec2/latest/instancetypes/co.html', () =>
    HttpResponse.html(fixture('ec2-compute_optimized.html')),
  ),
  http.get('https://docs.aws.amazon.com/ec2/latest/instancetypes/mo.html', () =>
    HttpResponse.html(fixture('ec2-memory_optimized.html')),
  ),
  http.get('https://docs.aws.amazon.com/ec2/latest/instancetypes/so.html', () =>
    HttpResponse.html(fixture('ec2-storage_optimized.html')),
  ),
  http.get('https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html', () =>
    HttpResponse.html(fixture('ec2-accelerated_computing.html')),
  ),
  http.get(
    'https://docs.aws.amazon.com/ec2/latest/instancetypes/hpc.html',
    () => HttpResponse.html(fixture('ec2-hpc.html')),
  ),
  http.get(
    'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.Summary.html',
    () => HttpResponse.html(fixture('rds.html')),
  ),
  http.get(
    'https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheNodes.SupportedTypes.html',
    () => HttpResponse.html(fixture('elasticache.html')),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
