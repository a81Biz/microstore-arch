# Test Scenarios — PT-002

## calculateOrderStatus

**TS-002.1** — Empty items → PAID  
**TS-002.2** — All items SHIPPED → SHIPPED  
**TS-002.3** — All items in [IN_PRODUCTION, READY_TO_SHIP, SHIPPED] → IN_PRODUCTION  
**TS-002.4** — Any item PENDING or RESERVED → PAID  
**TS-002.5** — Mixed (some SHIPPED, some PENDING) → PAID (anyPending wins)

## getStockBadge

**TS-002.6** — isOnDemand=true → variant='info', disabled=false, text='Bajo Pedido'  
**TS-002.7** — stockQuantity=0 → variant='error', disabled=true, text='Agotado'  
**TS-002.8** — stockQuantity=3 (≤5) → variant='warning', disabled=false, text='Últimos 3'  
**TS-002.9** — stockQuantity=50 → variant='success', disabled=false, text='Disponible'

## ShippingAddressSchema

**TS-002.10** — Valid address (all fields correct) → parse success  
**TS-002.11** — street too short (< 5 chars) → Zod error mentioning 'calle'  
**TS-002.12** — country not 2 chars → Zod error mentioning 'ISO'  
**TS-002.13** — Missing required field → Zod error

## Enum Integrity

**TS-002.14** — OrderStatus values include 'pending', 'paid', 'shipped', 'delivered'  
**TS-002.15** — PaymentGateway values include 'stripe', 'paypal', 'mercadopago', 'hey_banco'  
**TS-002.16** — UserRole values exist (at least 'customer', 'vendor', 'admin')
