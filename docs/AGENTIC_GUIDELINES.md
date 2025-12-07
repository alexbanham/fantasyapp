# Agentic Development Guidelines

This document serves as a comprehensive guide for AI agents and developers working on this codebase. These guidelines ensure software best practices are followed at all times, maintaining code quality, maintainability, and preventing over-engineering.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Code Organization](#code-organization)
3. [Design Patterns](#design-patterns)
4. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
5. [Refactoring Guidelines](#refactoring-guidelines)
6. [Testing Considerations](#testing-considerations)
7. [Performance Guidelines](#performance-guidelines)
8. [Security Best Practices](#security-best-practices)
9. [Documentation Standards](#documentation-standards)
10. [Code Review Checklist](#code-review-checklist)

---

## Core Principles

### DRY (Don't Repeat Yourself)

**Rule**: Extract duplicate code into reusable functions, utilities, or services.

**When to apply:**
- Same logic appears in 2+ places
- Similar patterns exist across multiple files
- Configuration values are hardcoded multiple times

**When NOT to apply:**
- Code looks similar but serves different purposes (coincidental duplication)
- Premature abstraction before understanding the full scope
- Over-abstraction that makes code harder to understand

**Example - Good:**
```javascript
// ✅ Extract common validation logic
function validateGameId(gameId) {
  if (!gameId || typeof gameId !== 'string') {
    throw new Error('Invalid game ID');
  }
  return gameId;
}

// Use in multiple routes
app.get('/api/games/:gameId', (req, res) => {
  const gameId = validateGameId(req.params.gameId);
  // ...
});
```

**Example - Bad:**
```javascript
// ❌ Don't abstract prematurely
function processData(data, type) {
  if (type === 'A') {
    // complex logic A
  } else if (type === 'B') {
    // complex logic B
  }
  // This abstraction doesn't help - keep them separate
}
```
### YAGNI (You Aren't Gonna Need It)

**Rule**: Don't add functionality until it's actually needed.

**Red flags:**
- Adding "just in case" parameters
- Creating abstractions for hypothetical future use cases
- Building features "for extensibility" without current requirements
- Adding configuration options that aren't currently needed

**Example - Bad:**
```javascript
// ❌ Over-engineering for future flexibility
class DataProcessor {
  constructor(options = {}) {
    this.cacheStrategy = options.cacheStrategy || 'memory';
    this.compressionLevel = options.compressionLevel || 5;
    this.encryptionEnabled = options.encryptionEnabled || false;
    // ... 10 more unused options
  }
}

// ✅ Simple, current needs only
class DataProcessor {
  constructor() {
    this.cache = new Map();
  }
}
```

### SOLID Principles

#### Single Responsibility Principle (SRP)
- Each module/class/function should have one reason to change
- Services handle business logic, routes handle HTTP, models handle data

#### Open/Closed Principle (OCP)
- Open for extension, closed for modification
- Use composition and dependency injection over inheritance

#### Liskov Substitution Principle (LSP)
- Subtypes must be substitutable for their base types
- Less relevant in JavaScript, but applies to interfaces/contracts

#### Interface Segregation Principle (ISP)
- Clients shouldn't depend on interfaces they don't use
- Keep function parameters minimal and focused

#### Dependency Inversion Principle (DIP)
- Depend on abstractions, not concretions
- Use dependency injection for services

---

## Code Organization

### Project Structure

Follow the existing structure:
```
backend/src/
├── models/          # Data models (Mongoose schemas)
├── routes/          # Express route handlers
├── services/        # Business logic and external API integrations
├── utils/           # Pure utility functions
├── cron/            # Scheduled tasks
└── server.js        # Application entry point
```

### File Naming Conventions

- **Models**: PascalCase, singular (e.g., `Game.js`, `FantasyPlayer.js`)
- **Routes**: camelCase, descriptive (e.g., `bettingOdds.js`, `playerDetails.js`)
- **Services**: camelCase, ends with "Service" (e.g., `espnService.js`, `gamePollingService.js`)
- **Utils**: camelCase, descriptive (e.g., `optimalLineupCalculator.js`)

### Module Responsibilities

**Routes (`routes/`):**
- Handle HTTP requests/responses
- Validate input
- Call services
- Return formatted responses
- **DO NOT**: Contain business logic, database queries, or complex calculations

**Services (`services/`):**
- Business logic
- External API calls
- Data transformation
- **DO NOT**: Handle HTTP directly or contain route logic

**Models (`models/`):**
- Database schemas
- Data validation
- Static helper methods on models
- **DO NOT**: Contain business logic or HTTP handling

**Utils (`utils/`):**
- Pure functions (no side effects)
- Reusable calculations
- Data transformations
- **DO NOT**: Make API calls or access database

---

## Design Patterns

### When to Use Patterns

#### Service Pattern ✅
**Use when:**
- Integrating with external APIs
- Complex business logic that spans multiple models
- Background processing or polling

**Example:**
```javascript
// ✅ Good: Service encapsulates ESPN API logic
class EspnService {
  async fetchGameData(gameId) {
    // API call, error handling, transformation
  }
}
```

#### Repository Pattern ⚠️
**Use when:**
- Complex data access logic
- Need to abstract database implementation
- Multiple data sources

**Avoid when:**
- Simple CRUD operations (Mongoose already provides this)
- Over-engineering for basic queries

#### Factory Pattern ⚠️
**Use when:**
- Creating objects with complex initialization
- Need to support multiple types of similar objects

**Avoid when:**
- Simple object creation (`new Model()` is sufficient)

#### Singleton Pattern ❌
**Generally avoid** - Use dependency injection instead. If needed, use module exports:
```javascript
// ✅ Acceptable singleton pattern
let instance = null;
module.exports = {
  getInstance() {
    if (!instance) instance = new Service();
    return instance;
  }
};
```

#### Strategy Pattern ✅
**Use when:**
- Multiple algorithms for the same operation
- Need to switch implementations at runtime

**Example:**
```javascript
// ✅ Good: Different scoring strategies
const scoringStrategies = {
  standard: (stats) => stats.points,
  ppr: (stats) => stats.points + stats.receptions,
  halfPpr: (stats) => stats.points + (stats.receptions * 0.5)
};
```

### When NOT to Use Patterns

**Don't use patterns:**
- Just because you know them
- For simple problems that don't need abstraction
- To show off technical knowledge
- Before understanding the actual requirements

**Red flags:**
- "Let's add a factory for creating routes"
- "We should use the observer pattern for this simple event"
- "This needs a strategy pattern" (for a single calculation)

---

## Anti-Patterns to Avoid

### 1. God Object / God Function
**Problem**: One class/function does too much

**Solution**: Break into smaller, focused modules

```javascript
// ❌ Bad: One function does everything
async function processGameData(gameId) {
  // Fetch from API
  // Transform data
  // Save to database
  // Update cache
  // Send notifications
  // Log analytics
  // ... 200 lines
}

// ✅ Good: Separate concerns
async function processGameData(gameId) {
  const rawData = await gameService.fetch(gameId);
  const transformed = gameTransformer.transform(rawData);
  await gameRepository.save(transformed);
  await cacheService.update(gameId, transformed);
}
```

### 2. Premature Optimization
**Problem**: Optimizing before measuring

**Solution**: Write clear code first, optimize only when needed

```javascript
// ❌ Bad: Premature optimization
const cache = new Map();
function getData(id) {
  if (cache.has(id)) return cache.get(id);
  const data = expensiveOperation(id);
  cache.set(id, data);
  return data;
}
// But expensiveOperation is actually fast...

// ✅ Good: Simple first
function getData(id) {
  return expensiveOperation(id);
}
// Add caching later if profiling shows it's needed
```

### 3. Magic Numbers and Strings
**Problem**: Hardcoded values without context

**Solution**: Use named constants

```javascript
// ❌ Bad
if (status === 'live' && score > 100) {
  // What does 100 mean?
}

// ✅ Good
const MIN_SCORE_THRESHOLD = 100;
const GAME_STATUS_LIVE = 'live';

if (status === GAME_STATUS_LIVE && score > MIN_SCORE_THRESHOLD) {
  // Clear intent
}
```

### 4. Deep Nesting
**Problem**: Too many nested if/for statements

**Solution**: Early returns, guard clauses, extract functions

```javascript
// ❌ Bad: Deep nesting
function processPlayer(player) {
  if (player) {
    if (player.stats) {
      if (player.stats.points) {
        if (player.stats.points > 0) {
          // actual logic
        }
      }
    }
  }
}

// ✅ Good: Early returns
function processPlayer(player) {
  if (!player?.stats?.points) return null;
  if (player.stats.points <= 0) return null;
  // actual logic
}
```

### 5. Copy-Paste Programming
**Problem**: Duplicating code instead of extracting

**Solution**: Extract common logic into functions/services

### 6. Over-Abstraction
**Problem**: Creating abstractions that don't simplify

**Solution**: Keep it concrete until patterns emerge

```javascript
// ❌ Bad: Over-abstracted
class DataFetcherFactory {
  createFetcher(type) {
    return new FetcherStrategy(type).build();
  }
}

// ✅ Good: Simple and clear
async function fetchGameData(gameId) {
  return await espnService.getGame(gameId);
}
```

---

## Refactoring Guidelines

### When to Refactor

**Refactor when:**
- Code duplication is identified (DRY violation)
- Function/class is too long (>50 lines, or hard to understand)
- Function has too many responsibilities
- Code is hard to test
- Performance issues are identified (after profiling)

**Don't refactor when:**
- Code works and is unlikely to change
- No clear benefit from refactoring
- Under time pressure (unless blocking)
- Refactoring would break working code without tests

### Refactoring Process

1. **Understand the code** - Read and trace execution
2. **Write tests** (if they don't exist)
3. **Make small changes** - One refactoring at a time
4. **Test after each change** - Ensure nothing breaks
5. **Commit frequently** - Small, atomic commits

### Common Refactorings

**Extract Function:**
```javascript
// Before
function calculateTotal(players) {
  let total = 0;
  for (const player of players) {
    if (player.active && player.points) {
      total += player.points;
    }
  }
  return total;
}

// After
function calculateTotal(players) {
  return players
    .filter(player => player.active && player.points)
    .reduce((sum, player) => sum + player.points, 0);
}
```

**Extract Service:**
- Move business logic from routes to services
- Keep routes thin, services focused

**Rename for Clarity:**
- Use descriptive names
- Avoid abbreviations unless widely understood

---

## Testing Considerations

### Test Structure

- **Unit tests**: Test individual functions/services in isolation
- **Integration tests**: Test API endpoints with database
- **E2E tests**: Test full user workflows (if applicable)

### What to Test

**DO test:**
- Business logic and calculations
- Error handling and edge cases
- Data transformations
- Critical user paths

**DON'T test:**
- Framework code (Express, Mongoose internals)
- Third-party library functionality
- Trivial getters/setters
- Code that's likely to change frequently (UI components)

### Testing Best Practices

- **Arrange-Act-Assert** pattern
- **One assertion per test** (when possible)
- **Test behavior, not implementation**
- **Use descriptive test names**: `should return error when gameId is invalid`

---

## Performance Guidelines

### Optimization Principles

1. **Measure first** - Profile before optimizing
2. **Optimize bottlenecks** - Focus on slow parts
3. **Consider trade-offs** - Performance vs. maintainability

### Common Optimizations

**Database:**
- Add indexes for frequently queried fields
- Use `.select()` to limit fields returned
- Implement pagination for large datasets
- Use aggregation pipelines for complex queries

**Caching:**
- Cache expensive computations
- Cache external API responses (with TTL)
- Use Redis for shared cache (if needed)
- Invalidate cache appropriately

**API Calls:**
- Batch requests when possible
- Use parallel requests (Promise.all) for independent calls
- Implement retry logic with exponential backoff
- Set appropriate timeouts

**Code:**
- Avoid N+1 queries
- Use streaming for large datasets
- Lazy load when possible
- Debounce/throttle user input handlers

### When NOT to Optimize

- Premature optimization (before profiling)
- Micro-optimizations that hurt readability
- Optimizing code that's rarely executed
- Optimizing without understanding the problem

---

## Security Best Practices

### Input Validation

- **Always validate** user input
- **Sanitize** data before database operations
- **Use parameterized queries** (Mongoose handles this)
- **Validate types** and ranges

```javascript
// ✅ Good: Validate input
function getPlayer(playerId) {
  if (!playerId || typeof playerId !== 'string') {
    throw new Error('Invalid player ID');
  }
  // ... proceed
}
```

### Authentication & Authorization

- Use environment variables for secrets
- Never commit API keys or passwords
- Implement proper authentication middleware
- Check permissions before operations

### Error Handling

- **Don't expose internals** in error messages
- **Log errors** with context
- **Return generic messages** to clients
- **Handle errors gracefully**

```javascript
// ❌ Bad: Exposes internal details
catch (error) {
  res.status(500).json({ error: error.message });
}

// ✅ Good: Generic error, detailed logging
catch (error) {
  console.error('Error fetching player:', error);
  res.status(500).json({ error: 'Failed to fetch player data' });
}
```

### Dependencies

- Keep dependencies up to date
- Review security advisories
- Use `npm audit` regularly
- Prefer well-maintained packages

---

## Documentation Standards

### Code Comments

**DO comment:**
- Complex algorithms or business logic
- Non-obvious decisions and "why"
- Workarounds or temporary solutions
- Public API functions

**DON'T comment:**
- Self-explanatory code
- What the code does (code should be clear)
- Obvious implementations

```javascript
// ❌ Bad: Comment states the obvious
// Get player by ID
function getPlayer(id) {
  return Player.findById(id);
}

// ✅ Good: Comment explains why
// Cache for 5 minutes to reduce API calls while maintaining freshness
const CACHE_TTL = 5 * 60 * 1000;
```

### Function Documentation

For public APIs and complex functions, use JSDoc:

```javascript
/**
 * Calculates optimal fantasy lineup based on player projections
 * @param {Array<Player>} players - Available players
 * @param {Object} constraints - Lineup constraints (salary cap, positions, etc.)
 * @returns {Array<Player>} Optimal lineup
 * @throws {Error} If constraints are invalid
 */
function calculateOptimalLineup(players, constraints) {
  // ...
}
```

### README and Documentation Files

- Keep README.md updated
- Document architecture decisions in `docs/`
- Include setup instructions
- Document environment variables

---

## Code Review Checklist

Before submitting code, verify:

### Functionality
- [ ] Code works as intended
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] No breaking changes (or documented)

### Code Quality
- [ ] Follows DRY principle (no duplication)
- [ ] Follows KISS principle (simple solution)
- [ ] No over-engineering (YAGNI)
- [ ] Functions are focused (SRP)
- [ ] No magic numbers/strings

### Organization
- [ ] Code is in the right place (routes/services/models/utils)
- [ ] File names follow conventions
- [ ] Related code is grouped together
- [ ] No circular dependencies

### Performance
- [ ] No obvious performance issues
- [ ] Database queries are efficient
- [ ] Caching is used appropriately
- [ ] No unnecessary API calls

### Security
- [ ] Input validation present
- [ ] No secrets in code
- [ ] Error messages don't expose internals
- [ ] Dependencies are secure

### Documentation
- [ ] Complex logic is commented
- [ ] Public functions are documented
- [ ] README updated if needed

---

## Decision Framework

When making architectural decisions, ask:

1. **Is this the simplest solution?** (KISS)
2. **Do we actually need this?** (YAGNI)
3. **Will this reduce duplication?** (DRY)
4. **Is this maintainable?** (Can others understand it?)
5. **What's the cost of not doing this?** (Is the problem real?)

**If unsure, prefer:**
- Simpler over complex
- Concrete over abstract
- Explicit over implicit
- Standard patterns over custom solutions

---

## Examples from This Codebase

### ✅ Good Patterns

**Service Layer Separation:**
```javascript
// routes/bettingOdds.js - Thin route handler
app.get('/api/betting-odds', async (req, res) => {
  const odds = await bettingOddsService.getOdds(req.query);
  res.json(odds);
});

// services/bettingOddsService.js - Business logic
class BettingOddsService {
  async getOdds(query) {
    // Complex logic here
  }
}
```

**Model Helpers:**
```javascript
// models/Config.js - Static methods on models
Config.getConfig = async function() {
  // Reusable data access
};
```

### ❌ Anti-Patterns to Avoid

**Business Logic in Routes:**
```javascript
// ❌ Don't put business logic in routes
app.get('/api/players', async (req, res) => {
  const players = await Player.find();
  // Complex filtering, transformation, calculations here
  // Should be in a service
});
```

**Over-Abstracted Services:**
```javascript
// ❌ Don't create unnecessary abstractions
class GenericDataFetcherFactory {
  // Too abstract for current needs
}
```

---

## Summary

**Remember:**
- **DRY**: Eliminate duplication, but not at the cost of clarity
- **KISS**: Simple solutions are usually best
- **YAGNI**: Build what you need, not what you might need
- **SOLID**: Keep responsibilities clear and dependencies manageable
- **Measure**: Optimize based on data, not assumptions
- **Test**: Test behavior, keep tests simple
- **Document**: Explain why, not what

**When in doubt, choose simplicity over cleverness.**

---

*Last updated: [Current Date]*
*This document should be reviewed and updated as the codebase evolves.*





