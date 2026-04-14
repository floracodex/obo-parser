# Contributing

Thank you for your interest in contributing to `@floracodex/obo-parser`.

## Development setup

```bash
git clone https://github.com/floracodex/obo-parser.git
cd obo-parser
npm install
```

## Scripts

| Command              | Description                      |
| -------------------- | -------------------------------- |
| `npm run build`      | Build ESM + CJS output with tsup |
| `npm test`           | Run tests with vitest            |
| `npm run test:watch` | Run tests in watch mode          |
| `npm run typecheck`  | Type-check source files          |
| `npm run lint`       | Lint with ESLint                 |
| `npm run lint:fix`   | Lint and auto-fix                |
| `npm run format`     | Format with Prettier             |

## Before submitting a PR

1. Run `npm run typecheck` — no type errors
2. Run `npm run lint` — no lint errors
3. Run `npm test` — all tests pass
4. Run `npm run format` — code is formatted

## Integration tests

The integration tests parse real OBO files from OBO Foundry. To run them:

```bash
curl -sL http://purl.obolibrary.org/obo/uo.obo -o test/integration/uo.obo
npm test
```

These files are gitignored and not required for the unit test suite to pass.
