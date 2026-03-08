# Contributing to aws-instance-info

Thank you for your interest in contributing to **aws-instance-info**! This document will guide you through the process of setting up your development environment and contributing to the project.

## Table of Contents

- [About the Project](#about-the-project)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## About the Project

**aws-instance-info** is a TypeScript library that provides comprehensive meta-information about AWS compute resources:

- **EC2 Instances** - ~1000 instance types across ~150 families
- **RDS Instance Classes** - ~350 instance classes across ~40 families
- **ElastiCache Node Types** - ~73 node types across ~13 families

The library fetches and parses AWS documentation pages at runtime to provide accurate, up-to-date specifications including memory, vCPUs, networking capabilities, EBS support, and more. Data is lazy-loaded on first use and cached using an LRU cache for optimal performance.

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** (comes with Node.js)

### Installation

1. **Fork and clone the repository:**

```bash
git clone https://github.com/YOUR_USERNAME/aws-instance-info.git
cd aws-instance-info
```

2. **Install dependencies:**

```bash
npm install
```

3. **Build the project:**

```bash
npm run build
```

4. **Run tests:**

```bash
npm test
```

## Project Architecture

```
aws-instance-info/
├── lib/                    # Source code
│   ├── index.ts           # Main entry (re-exports EC2, RDS, ElastiCache sync APIs)
│   ├── index.async.ts     # Async entry (re-exports EC2, RDS, ElastiCache async APIs)
│   ├── ec2.ts             # EC2 sync wrapper (uses make-synchronous)
│   ├── ec2.async.ts       # EC2 async API with inline LRU cache
│   ├── rds.ts             # RDS sync wrapper (uses make-synchronous)
│   ├── rds.async.ts       # RDS async API with inline LRU cache
│   ├── elasticache.ts     # ElastiCache sync wrapper (uses make-synchronous)
│   ├── elasticache.async.ts # ElastiCache async API with inline LRU cache
│   ├── fetch.ts           # HTML parsing + AWS docs fetch functions
│   ├── types.ts           # TypeScript interfaces (hand-written, safe to edit)
│   └── constants.ts       # LRU cache size constants
├── tests/                  # Test files
│   ├── fixtures/          # Saved HTML fixtures for MSW test intercepts
│   └── setup.ts           # MSW server setup
└── dist/                   # Compiled output (generated)
```

### Key Concepts

- **Runtime Fetch**: On first use, the library fetches AWS documentation pages and parses the HTML tables
- **LRU Caching**: Parsed data is cached in-memory to avoid redundant network requests
- **Plain Map Lookups**: A plain `Map` is kept alongside the LRU so entries are never silently evicted during bulk loads
- **Type Safety**: Full TypeScript support with hand-written interfaces in `lib/types.ts`
- **Sync + Async APIs**: Both synchronous (via `make-synchronous`) and asynchronous APIs available

## Making Changes

### Adding New Features

1. **API Functions**: Add to `lib/ec2.async.ts`, `lib/rds.async.ts`, or `lib/elasticache.async.ts` (and expose via the sync wrappers in `lib/ec2.ts`, `lib/rds.ts`, `lib/elasticache.ts` if needed)
2. **Tests**: Add corresponding tests in `tests/`
3. **Documentation**: Update README.md if adding user-facing features
4. **Type Definitions**: Edit `lib/types.ts` directly — it is hand-written and safe to modify

### Fixing Bugs

1. Create a test case that reproduces the bug
2. Fix the bug in the appropriate module
3. Ensure all tests pass
4. Document the fix in your commit message

## Testing

We use **Vitest** for testing.

### Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-run on changes)
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Writing Tests

- Test files live in `tests/` directory
- Follow existing test patterns
- Test both happy paths and error cases
- Include edge cases (invalid instance types, etc.)

Example test structure:

```typescript
import { describe, it, expect } from 'vitest';
import { getEC2InstanceInfo } from '../lib/ec2';

describe('getEC2InstanceInfo', () => {
  it('should return correct specs for m5.large', () => {
    const info = getEC2InstanceInfo('m5.large');
    expect(info.memoryGiB).toBe(8);
    expect(info.vCPUs).toBe(2);
  });

  it('should throw for invalid instance type', () => {
    expect(() => getEC2InstanceInfo('invalid')).toThrow();
  });
});
```

## Code Style

We use **Biome** for linting and formatting.

### Style Rules

- Single quotes for strings
- Semicolons as-needed (ASI-safe code only)
- 2-space indentation
- camelCase for variables and functions
- PascalCase for types and interfaces

### Linting

```bash
# Check for issues
npm run lint

# Format code
npm run format:fix
```

### Pre-commit Hooks

Husky runs `lint-staged` on commit, which:
- Runs Biome on staged files
- Runs related tests
- Prevents commits if checks fail

## Commit Guidelines

We follow **Conventional Commits** enforced by commitlint.

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Feature
feat(ec2): add support for G6 instance family

# Bug fix
fix(rds): correct memory value for db.r6g.xlarge

# Documentation
docs: update contributing guidelines
```

## Pull Request Process

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make your changes** following the guidelines above
4. **Test thoroughly**:
   ```bash
   npm run build
   npm test
   npm run lint
   ```
5. **Commit** using conventional commit format
6. **Push** to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
7. **Open a Pull Request** against the `main` branch

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventional commits

### PR Review

- Maintainers will review your PR
- Address any feedback or requested changes
- Once approved, a maintainer will merge your PR

## Getting Help

- **Issues**: Check [existing issues](https://github.com/brandonburrus/aws-instance-info/issues) or open a new one
- **Discussions**: For questions and ideas
- **Documentation**: See [API documentation](https://awsinstanceinfo.brandonburrus.com)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to **aws-instance-info**! 🎉
