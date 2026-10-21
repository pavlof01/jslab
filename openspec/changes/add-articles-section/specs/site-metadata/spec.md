# Spec Delta

## MODIFIED Requirements

### Requirement: Sitemap

`GET /sitemap.xml` SHALL answer 200 with an XML sitemap on `SITE_ORIGIN`, each entry with `changefreq` `weekly`: `/` at priority 1, `/playground` and `/v8-pipeline` at 0.9, `/type-conversion` and `/equality` at 0.8, and the indexed pages of the `articles` capability — `/articles` and `/ru/articles` at 0.7 while each lists a published article, and every published article page at 0.6. No `lastmod` is given. The embed pages, `/og` and draft article pages MUST NOT be listed.

#### Scenario: Default origin

- **WHEN** `/sitemap.xml` is requested with `SITE_ORIGIN` at its default and every article is a draft
- **THEN** it lists exactly `https://jslab.su/`, `https://jslab.su/playground`, `https://jslab.su/v8-pipeline`, `https://jslab.su/type-conversion` and `https://jslab.su/equality`
- **AND** no entry is under `/embed`

#### Scenario: A published article

- **WHEN** the English and Russian `deoptimization` articles have `status: published` and the others are drafts
- **THEN** the sitemap also lists `https://jslab.su/articles`, `https://jslab.su/ru/articles`, `https://jslab.su/articles/deoptimization` and `https://jslab.su/ru/articles/deoptimization`
- **AND** no other article page is listed
