# Releasing

A release is a **name for a point of main**, nothing more: the deployable
artifacts are Docker images tagged with the commit SHA, and that does not
change. The release machinery records which SHA a version refers to and writes
the changelog.

## How a release happens

1. Conventional commits land on `main` as usual.
2. [release-please](https://github.com/googleapis/release-please) keeps a
   rolling **release PR** open: it accumulates every `feat`/`fix`/… subject
   since the last tag into `CHANGELOG.md` and proposes the next semver bump
   (`feat` → minor, `fix` → patch, `feat!`/`BREAKING CHANGE` → major).
3. Merging that PR is the release: the bot pushes the `vX.Y.Z` tag and
   publishes the GitHub Release with the same notes.

Nothing deploys on a release. Deploys stay per-service, on push to `main`, by
path filter — a release does not restart anything.

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
commit's manifests automatically when the tag is SHA-shaped.

Caveat: only SHAs still reachable from `origin/main` can be re-deployed — the
2026-08 history rewrite orphaned the SHAs of older images, so the rollback
window effectively starts at commit `254dc60`.

## One-time setup (maintainer)

- `RELEASE_PLEASE_TOKEN` repo secret: a fine-grained PAT (contents: write,
  pull-requests: write). Without it the release PR is opened with the default
  token and the required `quality-gate` check never runs on it, so it cannot
  be merged.
- The first release PR after adoption proposes a bump from `0.1.0` (the number
  in `.release-please-manifest.json`; root `package.json` carries the same one).
  To open the public history at a different number, land an empty commit whose
  body carries `Release-As: 1.0.0` and let the bot re-cut.
- `bootstrap-sha` in `release-please-config.json` is `254dc60` — the same commit
  the rollback window starts at. Without it the first changelog would walk main
  back to the initial commit and list every subject in the 2026-08 rewritten
  history. Once the first release has landed, the setting is inert.
