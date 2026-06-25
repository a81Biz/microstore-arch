# Out of Scope — PT-009

- Dashboard or alerting configuration in Logflare (separate operational task)
- Metrics for functions other than create-order and payment-webhook
- Prometheus/Grafana/DataDog integration
- SLO alerting (e.g., alert if success_rate < 95%)
- Modifying existing logger.info/warn/error behavior
- Changing how Logflare is initialized (monitoring/logflare.ts unchanged)
- Metrics aggregation or time-series rollups
- Adding metrics to manage-orders, manage-cart, login, or other functions (future PTs)
