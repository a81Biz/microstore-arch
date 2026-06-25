# Spec Changes — PT-001

## 11-Conventions.md (update)
Add to the exclusion list under RULE-01:
```
Email template functions (send-order-email, send-shipping-email, send-delivery-email, send-status-email)
are excluded from Rule 1 (HTML in .ts) because they legitimately generate HTML email bodies.
The .astro/ cache directory is excluded from Rule 2 (inline styles in .astro) because it contains
Astro compiler output, not user-authored source.
```

## No other spec documents require changes.
