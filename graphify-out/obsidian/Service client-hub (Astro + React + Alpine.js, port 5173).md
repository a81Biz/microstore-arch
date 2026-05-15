---
source_file: "docker-compose.yml"
type: "code"
community: "Docker & Infrastructure Config"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Docker__Infrastructure_Config
---

# Service: client-hub (Astro + React + Alpine.js, port 5173)

## Connections
- [[Service db-migrate (applies all .sql migrations in order, runs once)]] - `references` [EXTRACTED]
- [[Service nginx (reverse proxy port 80)]] - `references` [EXTRACTED]
- [[docker-compose.yml Full Local Development Stack]] - `implements` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Docker__Infrastructure_Config