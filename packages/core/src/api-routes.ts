export const API_ROUTES = {
  admin: {
    login: '/functions/v1/login',
    changePassword: '/functions/v1/change-password',
    setupTotp: '/functions/v1/setup-totp',
    confirmTotp: '/functions/v1/confirm-totp',
    verifyTotp: '/functions/v1/verify-totp',
    products: '/functions/v1/manage-products',
    orders: '/functions/v1/manage-orders',
    paymentGateways: '/functions/v1/manage-payment-gateways',
  },
  client: {
    orders: '/functions/v1/manage-orders',
    createOrder: '/functions/v1/create-order',
    paymentGateways: '/functions/v1/manage-payment-gateways/public',
  },
  webhooks: {
    payment: '/functions/v1/payment-webhook',
  },
} as const;
