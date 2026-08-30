# Security Policy

This is a personal expense tracker: a Next.js application that stores a user's
own financial records in MongoDB behind Google sign-in. The data it holds is
private by nature, so security reports are welcome and taken seriously.

## Reporting a vulnerability

**Please do not open a public issue for a security problem, and do not include a
proof of concept in a public pull request.**

Report it privately through GitHub:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability** (GitHub private vulnerability reporting).
3. Describe what you found, the impact, and the steps to reproduce it.

If private reporting is not enabled on the repository, contact the repository
owner directly through their GitHub profile and ask for a private channel before
sending any details.

### What to expect

| Stage | Target |
| --- | --- |
| Acknowledgement of your report | within 5 working days |
| Initial assessment and severity | within 10 working days |
| Fix or documented mitigation for a confirmed high/critical issue | within 30 days |

These are targets for a project maintained in someone's spare time, not a
contractual SLA. You will be told if something is going to take longer.

### What is in scope

- Authentication and session handling (`app/api/auth/[...nextauth]/route.ts`,
  `middleware.ts`)
- Authorization and per-user data isolation on `/api/expenses` and
  `/api/user/currency` — anything that lets one account read or modify another
  account's expenses
- Input validation and injection (`lib/validation.ts` is the trust boundary)
- Secret handling and configuration exposure
- Response headers and content security policy (`next.config.ts`)

### What is out of scope

- Findings against a deployment you do not own or have not been authorized to
  test. **Do not run active scanners against the production deployment.** Stand
  up your own instance instead — the app builds and runs locally with no
  credentials required at build time.
- Vulnerabilities in third-party dependencies with no demonstrated path through
  this application. Report those upstream; `npm audit` runs in CI here and
  dependency bumps are handled by Dependabot.
- Missing hardening that carries no exploitable impact (for example, a header
  that is present but could be stricter), unless you can show what it enables.
- Social engineering, physical access, and denial of service through sheer
  volume of traffic.

### Coordinated disclosure

Please give the maintainer a reasonable window to ship a fix before publishing.
Credit is given in the release notes unless you would rather stay anonymous.

## Supported versions

This project ships from `main` and has no release branches. Only the current
`main` is supported; there are no backports to earlier commits.

| Version | Supported |
| --- | --- |
| `main` (latest commit) | ✅ Yes |
| Any earlier commit or fork | ❌ No |

Deployments are expected to track `main`. If you run a fork, you are responsible
for pulling security fixes yourself.

### Runtime and toolchain

| Component | Required |
| --- | --- |
| Node.js | 24 LTS (`.nvmrc`, enforced by `engines` + `engine-strict`) |
| npm | 12 or newer |

Older Node versions are not supported and will be refused at install time.

## How this repository is defended

| Control | Where |
| --- | --- |
| Lint, typecheck, build and `npm audit --audit-level=high` on every PR | `.github/workflows/ci.yml` |
| Semgrep SAST (`p/security-audit`, `p/typescript`, `p/react`, `p/nextjs`) | `.github/workflows/security.yml` |
| Secret scanning over the full history (gitleaks) | `.github/workflows/security.yml` |
| Dangerous-sink lint rules (`eslint-plugin-security`, `eslint-plugin-no-unsanitized`) | `eslint.config.mjs` |
| Weekly dependency and GitHub Actions update PRs | `.github/dependabot.yml` |
| Request validation before anything reaches the database | `lib/validation.ts` |
| Structured, PII-free server-side error logging | `lib/logger.ts` |

All GitHub Actions are pinned to full commit SHAs and every workflow declares
least-privilege `permissions`.

## Repository settings a maintainer still has to enable

The items below are **repository settings, not files**. They cannot be committed
and must be turned on by someone with admin rights:

- **Branch protection on `main`** — require a pull request, require the `CI` and
  `Security` checks to pass, and disallow direct pushes.
- **Dependabot alerts and security updates** — `.github/dependabot.yml`
  configures update pull requests; alerts are a separate setting under
  *Settings → Code security*.
- **Private vulnerability reporting** — enable it so the process at the top of
  this file works.
- **Merge hygiene** — enable *Automatically delete head branches*, make squash
  merge the default, and disable merge commits.

## If a secret is exposed

Rotate first, investigate second. `NEXTAUTH_SECRET` in particular has been
present in this repository's git history in the past; rotating it
(`openssl rand -base64 32`) invalidates every existing session, which is the
intended outcome. The same applies to `MONGODB_URI`, `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET`.
