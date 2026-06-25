# Out of Scope — PT-005

- Admin UI for managing the vendor_whitelist (adding/removing entries)
- Whitelist enforcement in any flow other than the initial login
- Adding expiry/time-limited access to whitelist entries
- Whitelist enforcement for CUSTOMER or ADMIN roles
- Changing how vendors are added to the whitelist (currently manual SQL)
- Email notification to rejected vendors
- Adding 'is_active' column to vendor_whitelist (table currently has email + created_at only)
