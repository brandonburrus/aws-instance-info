# Contributing to aws-instance-info

Thank you for your interest in contributing to **aws-instance-info**! This document will guide you through the process of setting up your development environment and contributing to the project.

## Table of Contents

- [About the Project](#about-the-project)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Making Changes](#making-changes)
- [Data Generation](#data-generation)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## About the Project

**aws-instance-info** is a TypeScript library that provides comprehensive meta-information about AWS compute resources:

- **EC2 Instances** - ~1000 instance types across ~150 families
- **RDS Instance Classes** - ~350 instance classes across ~40 families
- **ElastiCache Node Types** - ~73 node types across ~13 families

The library scrapes AWS documentation to provide accurate, up-to-date specifications including memory, vCPUs, networking capabilities, EBS support, and more. Data is lazy-loaded on-demand and cached using an LRU cache for optimal performance.

## Development Setup

### Prerequisites

- **Node.js** >= 16.0.0
- **npm** (comes with Node.js)
- **Python** (for data generation script)
- **uv** (Python package manager, for data generation)

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
│   ├── index.ts           # Main entry (re-exports EC2, RDS, ElastiCache)
│   ├── ec2.ts             # EC2 API functions
│   ├── rds.ts             # RDS API functions
│   ├── elasticache.ts     # ElastiCache API functions
│   └── types.ts           # Auto-generated TypeScript types (DO NOT EDIT)
├── data/                   # Generated JSON data (DO NOT EDIT)
│   ├── ec2/
│   │   ├── info.json      # Manifest of families, instances, categories
│   │   ├── families/      # ~150 family JSON files (M5.json, C7.json, etc.)
│   │   └── instances/     # ~1000 instance JSON files (m5.large.json, etc.)
│   ├── rds/
│   │   ├── info.json
│   │   ├── families/      # ~40 family JSON files
│   │   └── instances/     # ~350 instance JSON files
│   └── elasticache/
│       ├── info.json
│       ├── families/      # ~13 family JSON files
│       └── nodes/         # ~73 node type JSON files
├── scripts/
│   └── generate.py        # Data generation script
├── tests/                  # Test files
└── dist/                   # Compiled output (generated)
```

### Key Concepts

- **Lazy Loading**: Instance data is only loaded from disk when requested
- **LRU Caching**: Loaded data is cached to minimize disk I/O
- **Type Safety**: Full TypeScript support with auto-generated union types
- **Sync + Async APIs**: Both synchronous and asynchronous APIs available

## Making Changes

### Adding New Features

1. **API Functions**: Add to `lib/ec2.ts`, `lib/rds.ts`, or `lib/elasticache.ts`
2. **Tests**: Add corresponding tests in `tests/`
3. **Documentation**: Update README.md if adding user-facing features
4. **Type Definitions**: Types are auto-generated - don't edit `lib/types.ts` manually

### Fixing Bugs

1. Create a test case that reproduces the bug
2. Fix the bug in the appropriate module
3. Ensure all tests pass
4. Document the fix in your commit message

## Data Generation

The `scripts/generate.py` script scrapes AWS documentation and generates:

1. JSON data files for all instance types/families
2. TypeScript union types in `lib/types.ts`

### Running Data Generation

```bash
cd scripts
uv run generate.py
```

**Important Notes:**
- Data generation requires internet access to scrape AWS docs
- The script uses Python with `uv` package manager
- Never manually edit files in `data/` or `lib/types.ts`
- After regenerating data, rebuild and test:
  ```bash
  npm run build
  npm test
  ```

### When to Regenerate Data

- AWS releases new instance types/families
- AWS updates specifications for existing instances
- Bug fixes in the scraping logic

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

# Data update
chore(data): regenerate instance data from AWS docs
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
- [ ] No manual edits to generated files (`data/`, `lib/types.ts`)

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
