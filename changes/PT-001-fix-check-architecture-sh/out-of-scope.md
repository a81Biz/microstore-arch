# Out of Scope — PT-001

- Rewriting check-architecture.sh in TypeScript/Node
- Adding new architecture rules beyond the existing 5
- Fixing the inline styles that were the source of Rule 2 violations (done by PT-007)
- CI/CD pipeline changes (the script is invoked by ci.yml without changes)
- Adding HTML-in-.ts false positive exemptions for anything other than email templates
- Performance optimization of the grep commands
