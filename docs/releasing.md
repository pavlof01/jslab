# Releasing

A release is a **name for a point of main**, nothing more: the deployable
artifacts are Docker images tagged with the commit SHA, and that does not
change. The release machinery records which SHA a version refers to and writes
the changelog. Nothing deploys on a release, and by the time a release PR
exists, everything in it is already running in production.

## The pipeline

### 1. Day to day — the only input

Branch → PR → conventional title → squash-merge. The PR title becomes the
commit subject on `main` (`pr-title.yml` lints it with the repo's commitlint
config), and that subject is the only thing release-please reads. There is no
separate "prepare a release" step.

| Subject                                        | Version                   | `CHANGELOG.md` section |
| ---------------------------------------------- | ------------------------- | ---------------------- |
| `feat:`                                        | minor (`0.2.0` → `0.3.0`) | Features               |
| `fix:`                                         | patch                     | Bug Fixes              |
| `perf:` `refactor:` `infra:` `docs:` `revert:` | patch                     | their own sections     |
| `chore:` `ci:` `test:` `style:`                | nothing                   | not listed             |
| `feat!:` or a `BREAKING CHANGE:` footer        | **major**                 | Features               |
| any subject with a `Release-As: X.Y.Z` footer  | exactly `X.Y.Z`           | —                      |

Two consequences of the config in `release-please-config.json` worth knowing:

- **A lone `docs:` (or `refactor:`, `infra:`, `perf:`) opens a release PR** with a
  patch bump. release-please opens a PR whenever the generated changelog is
  non-empty, and those types are listed as visible `changelog-sections`. The
  alternative — `"hidden": true` on a section — keeps the type out of the
  changelog entirely, even when it lands next to a `feat`.
- **The first `feat!:` bumps to `1.0.0`.** `bump-minor-pre-major` is unset, so
  a breaking change on `0.x` is a major bump. Set it to `true` to have breaking
  changes bump the minor while the project is pre-1.0, and go to `1.0.0`
  deliberately with `Release-As`.

### 2. On every push to `main` — automatic

- `ci.yml` runs the quality gate on `main`.
- `deploy-*.yml` deploy the services whose paths changed (`apps/api/**` → api,
  `packages/engine-runtime/**` → api and every engine, …). Images are tagged
  with the commit SHA. **Production is updated here, before any release.**
- `release.yml` mints a one-hour token for the `jslab-release-bot` GitHub App
  and runs [release-please](https://github.com/googleapis/release-please). It
  collects the commits since the last tag (or `bootstrap-sha` before the first
  release), computes the version, regenerates `CHANGELOG.md`, and **opens or
  updates** the rolling PR `chore(main): release X.Y.Z` from the branch
  `release-please--branches--main--components--jslab`, labelled
  `autorelease: pending`. A `chore:`/`ci:` push leaves that PR untouched — it
  is not even rebased — because nothing in the release changed.

Because the PR is opened by the App and not by `GITHUB_TOKEN`, workflows run on
it like on any other PR: `ci.yml` (the quality gate) and `e2e.yml`, which
builds the whole compose stack to its production targets and runs the browser
suite. The release PR is the one place the full stack is exercised before a
version name is attached to it.

### 3. Cutting the release — you

1. Open the release PR and read the `CHANGELOG.md` diff; that is the release
   notes.
2. Fix what needs fixing:
   - **A misleading entry**: edit the body of the _source_ PR that was merged
     and add a `BEGIN_COMMIT_OVERRIDE … END_COMMIT_OVERRIDE` block with the
     subject(s) you want; the next release-please run regenerates the
     changelog from it. Squash-merge only — with merge commits the bot cannot
     tell which commit the override belongs to.
   - **The GitHub Release text only**: edit the release PR's body. The Release
     is created from that body, not from `CHANGELOG.md`, so this changes the
     Release page but not the file in the repo.
   - **The version**: land an empty commit,
     `git commit --allow-empty -m "chore: release 1.0.0" -m "Release-As: 1.0.0"`.
3. Wait for the checks. The `main` ruleset requires none of them, so a red
   check does not block the merge — reading it is on you.
4. **Squash-merge.** The commit on `main` is `chore(main): release X.Y.Z (#NN)`.

The release commit touches `package.json`, `package-lock.json`,
`.release-please-manifest.json` and `CHANGELOG.md` — no deploy path filter
matches, so nothing deploys.

### 4. After the merge — automatic

`release.yml` runs again on the merge commit, finds the merged PR by its
`autorelease: pending` label, and:

- creates the GitHub Release `vX.Y.Z` — the tag is a lightweight one on the
  merge commit, the notes come from the PR body;
- flips the label to `autorelease: tagged` and comments on the PR with a link;
- counts the next release from this tag.

The tag triggers nothing.

## Version sources

| Thing                        | Where its version lives                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| The repo / a release         | `.release-please-manifest.json` — the number release-please reads and bumps; the git tag `vX.Y.Z` and root `package.json` are written from it |
| A running service            | the image tag = commit SHA (`kubectl -n jslab get deploy -o wide`)                                                                            |
| Service `package.json` files | frozen at `0.1.0` — inert; nothing resolves by them (`file:` + `install-links`)                                                               |
| Engine binaries (d8, jsc, …) | reported live by `GET /api/engines`, pinned by image digests via Renovate                                                                     |
| engine262 fork               | the submodule gitlink                                                                                                                         |

## Rolling back

Roll back a **service**, not a release: re-run its `deploy-*` workflow with
`image_tag` set to a previous 40-char commit SHA. The workflow renders that
commit's manifests automatically when the tag is SHA-shaped. The `vX.Y.Z` tag
is how you find which SHA a version name refers to.

Caveat: only SHAs still reachable from `origin/main` can be re-deployed — the
2026-08 history rewrite orphaned the SHAs of older images, so the rollback
window effectively starts at commit `254dc60`.

## One-time setup (maintainer)

- **`jslab-release-bot` GitHub App**, installed on this repository only, with
  `contents: write` and `pull requests: write`. Its App ID and private key are
  the `RELEASE_BOT_APP_ID` and `RELEASE_BOT_PRIVATE_KEY` repo secrets;
  `actions/create-github-app-token` turns them into a one-hour token per run.
  The default `GITHUB_TOKEN` cannot be used: the repository does not allow
  Actions to create pull requests, and even where it does, a PR opened with
  `GITHUB_TOKEN` triggers no workflows, so nothing would run on the release PR.
  A personal access token would work but is tied to a person and needs
  rotating; the App is neither.
- **`CHANGELOG.md` is in `.prettierignore`.** release-please writes it with
  `*` bullets and its own blank lines; Prettier would rewrite it and fail the
  quality gate on every release PR.
- The first release PR after adoption proposes a bump from `0.1.0` (the number
  in `.release-please-manifest.json`; root `package.json` carries the same one).
  To open the public history at a different number, land an empty commit whose
  body carries `Release-As: 1.0.0` and let the bot re-cut.
- `bootstrap-sha` in `release-please-config.json` is `254dc60` — the same commit
  the rollback window starts at. Without it the first changelog would walk main
  back to the initial commit and list every subject in the 2026-08 rewritten
  history. Once the first release has landed, the setting is inert.
