# SmartKazem Security Policy

SmartKazem is a static GitHub Pages application. Security improvements therefore focus on browser-enforced policies, safe client-side code, repository validation, and protection of user-provided data.

## Reporting

Please report security vulnerabilities privately through the repository's GitHub Security page rather than publishing exploit details in an issue.

## Scope

- Browser-side HTML/CSS/JavaScript
- Client-side API/model connection handling
- Repository and deployment configuration
- Content Security Policy and related browser controls

## Important limitation

A secret placed in client-side JavaScript, HTML, local storage, or a public repository is not secret. Provider API keys must never be committed to this repository.

## Maintenance rule

Security changes must preserve the site's four-language architecture, accessibility, responsive behavior, and existing content/service boundaries.
