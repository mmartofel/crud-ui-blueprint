# CLAUDE.md block for a Spring Boot API

Paste the block below into the `CLAUDE.md` of a Spring Boot API that a UI from this template will consume. It is
the "API contract" and "Database" sections of the API this template was built against (`spring-person-api-claude`),
with its resource names replaced by placeholders. The full contract rules for API teams of any stack are in
[API-CONTRACT.md](API-CONTRACT.md); the Spring Boot pitfalls met so far are at its end.

Replace `<read-role>`, `<write-role>`, and the example resources (`Order`, `Customer`) with yours.

````markdown
## API contract (consumed by the Web UI)
- The contract rules are in the UI template's `docs/API-CONTRACT.md`; this section is how this API follows them.
- Controllers never expose entities: use `*Response`, `*CreateRequest`, `*UpdateRequest` records.
- Errors are RFC 9457 Problem Details; validation and unique-constraint errors add `errors: [{field, code, message}]`
  (one `ApiExceptionHandler`). `code` is a stable, documented enum the UI translates (`required`, `email`, `past`,
  `unique`, `invalid`, `date-range`, `not-found`, `in-use`, plus your own); `message` is an English fallback.
  `field` is omitted for errors about the whole record (`in-use`). A new constraint or code must be added to the
  mapping, the `FieldError` schema enum, the README table and the tests.
- Cross-field rules are class-level constraints that report the error on one field, so the UI can show it next to an
  input (e.g. `@DateRange` reports the later date with code `date-range`).
- Error responses are documented by convention in one `OpenApiCustomizer` (400/409 on POST/PUT, 400 on list GETs,
  404 on `{id}` paths, 409 on DELETE of a referenced resource, `application/problem+json`, schema `Problem`), not by
  `@ApiResponse` on each method. Keep new endpoints consistent with it.
- List endpoints are paged (`page`, `size`, `sort`, `q`) and return `PagedModel` (`{content, page}`).
- List filters are optional, named query parameters next to `q`, `page`, `size` and `sort`, never a generic filter
  expression. Bind them to a `<Resource>Filter` record (`@ParameterObject @Valid`, `@Parameter(description)` per
  component) that builds a JPA `Specification`; filters combine with AND, and an invalid value returns 400 with
  `errors` (field = parameter name). `q` escapes the LIKE wildcards `%`, `_` and `\`.
  Example: `GET /api/orders?q=&status=&customerId=`.
- Relations:
  - Requests reference a related record by id: `<relation>Id` (e.g. `customerId`), nullable. An unknown id returns 400
    with a field error on `<relation>Id`, code `not-found`.
  - Responses embed a `Reference` summary `{id, label}` (e.g. `customer`), where `label` is the related record's
    display name, so a list never needs one request per row. Load the relation with `@EntityGraph` on the
    repository's `findAll(Specification, Pageable)` and `findById` (`open-in-view` is off). Write endpoints of a
    resource with a relation are `@Transactional` and map the response inside the transaction; `PUT` uses
    `saveAndFlush`, so `version` and `updatedAt` in the response are current. Without the transaction, `save` merges
    the detached entity and the relation becomes an uninitialized proxy (`LazyInitializationException`, 500). Test
    changing a relation from one record to another, not only setting and clearing it, in an integration test: a
    mocked `@WebMvcTest` cannot see JPA proxies.
  - Deleting a record that is still referenced returns 409 with a `detail` and `errors: [{code: "in-use", message}]`
    without `field`; it never cascades. The foreign key is `ON DELETE RESTRICT` as a backstop.
  - A filter on a relation is `<relation>Id`.
- Method names are the OpenAPI operationIds: `list<Resource>s`, `get<Resource>`, `create<Resource>`,
  `update<Resource>`, `delete<Resource>`.
- Endpoints live under `/api`; reads need role `<read-role>` or `<write-role>`, writes need `<write-role>`
  (realm roles from the `realm_access.roles` claim).
- `PUT` is a full replacement: `*UpdateRequest` has the same constraints as `*CreateRequest` plus a required `version`
  from the last read (409 on mismatch). Optional fields sent as null are cleared; a field with a default sent as null
  gets its default again: the entity setter maps null to it, the request documents it with `@Schema(defaultValue)`,
  and the migration has the same `DEFAULT`.
- Server-set fields (`createdAt`, `updatedAt` via `@CreationTimestamp`/`@UpdateTimestamp`, `Instant`) appear only in
  responses, marked `@Schema(accessMode = READ_ONLY)`.
- Validation constraints must translate to JSON Schema/JavaScript (the UI generates Zod schemas from the contract): no
  Java-only regex syntax such as `(?s)` or possessive quantifiers; prefer `@NotBlank`, `@Size`, `@Email`. A rule Bean
  Validation cannot express gets a custom constraint plus the matching `@Schema` keyword (e.g. a step:
  `@MultipleOf("0.5")` with `@Schema(multipleOf = 0.5)`), and a DB `CHECK` with the same rule.
- Response records mark always-present fields with `@Schema(requiredMode = REQUIRED)`, so the generated TypeScript
  types are not optional; responses are documented as `application/json` (`springdoc.default-produces-media-type`).
- Unexpected exceptions become a 500 Problem Detail with a generic `detail` (logged, never the exception message).
- The OpenAPI `info.version` comes from Maven `build-info`; never hard-code it. Bump it with every contract change.
- After any API change run `mvn clean verify` and commit the regenerated `contract/openapi.json` (CI fails otherwise).

## Database
- Flyway owns the schema (`src/main/resources/db/migration`); Hibernate only validates it (`ddl-auto: validate`), so
  any mismatch between entities and migrations fails at startup.
- Never edit a migration that has been applied; every change is one new file `V<n>__<description>.sql`.
- Every entity change ships with its migration in the same commit.
- A new NOT NULL column gets a `DEFAULT` or a backfill, so existing rows keep working.
- Name constraints and indexes explicitly (`pk_`, `uk_`, `ck_`, `fk_`, `ix_`); index every foreign key column; map
  each unique constraint name to the `unique` error code in the exception handler.
````
