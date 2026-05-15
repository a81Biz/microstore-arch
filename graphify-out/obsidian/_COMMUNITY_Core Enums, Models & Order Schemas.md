---
type: community
cohesion: 0.15
members: 19
---

# Core Enums, Models & Order Schemas

**Cohesion:** 0.15 - loosely connected
**Members:** 19 nodes

## Members
- [[CreateOrderPayload]] - code - packages/core/src/schemas/order.schema.ts
- [[CreateOrderPayloadSchema]] - code - packages/core/src/schemas/order.schema.ts
- [[ItemFulfillmentStatus]] - code - packages/core/src/enums/fulfillment-status.ts
- [[Order]] - code - packages/core/src/models/order.ts
- [[OrderItem]] - code - packages/core/src/models/order.ts
- [[OrderItemStatus]] - code - packages/core/src/utils/order-status-calculator.ts
- [[OrderStatus]] - code - packages/core/src/enums/order-status.ts
- [[OrderTracking]] - code - packages/core/src/schemas/order.schema.ts
- [[OrderTrackingSchema]] - code - packages/core/src/schemas/order.schema.ts
- [[PaymentGateway]] - code - packages/core/src/enums/payment-gateway.ts
- [[ShippingAddress_1]] - code - packages/core/src/schemas/order.schema.ts
- [[ShippingAddressSchema]] - code - packages/core/src/schemas/order.schema.ts
- [[calculateOrderStatus()]] - code - packages/core/src/utils/order-status-calculator.ts
- [[fulfillment-status.ts]] - code - packages/core/src/enums/fulfillment-status.ts
- [[order-status-calculator.ts]] - code - packages/core/src/utils/order-status-calculator.ts
- [[order-status.ts]] - code - packages/core/src/enums/order-status.ts
- [[order.schema.ts]] - code - packages/core/src/schemas/order.schema.ts
- [[order.ts]] - code - packages/core/src/models/order.ts
- [[payment-gateway.ts]] - code - packages/core/src/enums/payment-gateway.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Core_Enums_Models__Order_Schemas
SORT file.name ASC
```
