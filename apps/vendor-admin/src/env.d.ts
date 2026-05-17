/// <reference types="astro/client" />

// Shared types (inline mirrors of lib types — keeps this file ambient, no imports needed)

interface VendorGateway {
  gateway: string;
  is_enabled: boolean;
  _toggling?: boolean;
}

interface VendorOrderSummary {
  id: string;
  displayId: string;
  customerEmail: string;
  status: string;
  totalAmount: number;
  currency: string;
  trackingId: string | null;
  carrier: string | null;
  itemsCount: number;
  createdAt: string;
  _toggling?: boolean;
}

interface VendorOrderDetail extends VendorOrderSummary {
  customerName: string | null;
  customerPhone: string | null;
  shippingAddress: { street: string; city: string; postal_code?: string; country?: string } | null;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    fulfillmentStatus: string;
  }>;
  statusHistory: Array<{ fromStatus: string | null; toStatus: string; changedAt: string }>;
  paymentInfo: { gateway: string; transactionId: string; amountCents: number; currency: string; paidAt: string } | null;
}

interface VendorProductImage {
  id: string | null;
  url: string;
  sortOrder: number;
  altText: string | null;
}

interface VendorProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  isOnDemand: boolean;
  isVisible: boolean;
  imageUrl: string | null;
  images: VendorProductImage[];
  createdAt: string;
  updatedAt: string;
  _toggling?: boolean;
}

// Alpine component state interfaces

interface VendorLoginFormState {
  step: string;
  email: string;
  password: string;
  newPassword: string;
  totpCode: string;
  tempToken: string;
  refreshToken: string;
  secret: string;
  qrCodeUrl: string;
  error: string;
  loading: boolean;
  handleLogin: () => Promise<void>;
  handleChangePassword: () => Promise<void>;
  handleVerifyTOTP: () => Promise<void>;
  loadTOTPSetup: () => Promise<void>;
  handleConfirmTOTP: () => Promise<void>;
}

interface DashboardState {
  loading: boolean;
  init: () => Promise<void>;
}

interface OrderAdminState {
  orders: VendorOrderSummary[];
  loading: boolean;
  search: string;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
  TERMINAL_STATUSES: string[];
  showDetail: boolean;
  detailLoading: boolean;
  selectedOrder: VendorOrderDetail | null;
  statusUpdate: string;
  processingStatus: boolean;
  showTracking: boolean;
  trackingData: { orderId: string; carrier: string; id: string };
  processingTracking: boolean;
  init: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  openDetail: (orderId: string) => Promise<void>;
  updateStatus: () => Promise<void>;
  openTrackingModal: (order: VendorOrderSummary) => void;
  submitTracking: () => Promise<void>;
  formatDate: (dateStr: string) => string;
  formatFullDate: (dateStr: string) => string;
  formatAddress: (addr: { street: string; city: string; postal_code?: string; country?: string } | null) => string;
  getStatusLabel: (status: string) => string;
}

interface ProductFormState {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  isOnDemand: boolean;
  isVisible: boolean;
  images: VendorProductImage[];
}

interface ProductListState {
  products: VendorProduct[];
  loading: boolean;
  showModal: boolean;
  editingProduct: VendorProduct | null;
  uploadingImage: boolean;
  $refs?: Record<string, HTMLElement>;
  form: ProductFormState;
  formLoading: boolean;
  formError: string;
  init: () => Promise<void>;
  loadProducts: () => Promise<void>;
  openCreateModal: () => void;
  openEditModal: (product: VendorProduct) => void;
  closeModal: () => void;
  resetForm: () => void;
  saveProduct: () => Promise<void>;
  handleImageUpload: (event: Event) => Promise<void>;
  removeImage: (img: VendorProductImage) => Promise<void>;
  toggleVisibility: (product: VendorProduct) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

interface PaymentCredentials {
  stripe: { publishableKey: string; secretKey: string; webhookSecret: string };
  paypal: { clientId: string; secret: string };
  mercadopago: { accessToken: string };
  hey_banco: { apiKey: string; clabe: string };
}

interface PaymentSettingsState {
  gateways: VendorGateway[];
  loading: boolean;
  authError: string;
  showForm: string | null;
  savingGateway: string | null;
  saveMessage: Record<string, string>;
  saveError: Record<string, string>;
  credentials: PaymentCredentials;
  loadGateways: () => Promise<void>;
  getGatewayName: (gateway: string) => string;
  getGatewayIcon: (gateway: string) => string;
  toggleForm: (gateway: string) => void;
  toggleGateway: (gateway: VendorGateway) => Promise<void>;
  saveCredentials: (gateway: string) => Promise<void>;
}

// Window augmentation for Alpine.js component factories

interface Window {
  vendorLoginForm: () => VendorLoginFormState;
  dashboard:       () => DashboardState;
  orderAdmin:      () => OrderAdminState;
  productList:     () => ProductListState;
  paymentSettings: () => PaymentSettingsState;
}
