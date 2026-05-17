/// <reference types="astro/client" />

// Shared Alpine types — mirrors lib types structurally (no import to stay ambient)

interface AlpineCustomerAddress {
  id: string;
  label: 'home' | 'office' | 'other';
  street: string;
  city: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

interface AlpineShippingAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

interface AlpinePaymentResult {
  gateway: string;
  sandboxInitPoint?: string;
  instructions?: {
    amount: string;
    currency: string;
    reference: string;
    bank: string;
    clabe: string;
  };
}

interface AlpineCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface AlpineOrderItem {
  id: string;
  productName: string;
  productSlug: string;
  quantity: number;
  unitPrice: string;
}

interface AlpineTimelineStep {
  label: string;
  status: 'completed' | 'current' | 'upcoming';
  date: string | null;
  icon: string;
}

interface AlpineOrderViewModel {
  id: string;
  displayId: string;
  status: string;
  totalAmount: string;
  currency: string;
  items: AlpineOrderItem[];
  trackingId: string | null;
  carrier: string | null;
  shippingAddress: string;
  createdAt: string;
  timeline: AlpineTimelineStep[];
}

interface AlpineProfileData {
  email: string | undefined;
  role: string;
  createdAt: string;
  name: string;
  phone: string;
}

// Alpine component state interfaces

interface CheckoutFormState {
  step: string;
  loading: boolean;
  processingPayment: boolean;
  error: string;
  postalCodeError: string;
  items: AlpineCartItem[];
  total: number;
  shipping: AlpineShippingAddress;
  savedAddresses: AlpineCustomerAddress[];
  selectedAddressId: string;
  saveNewAddress: boolean;
  isAuthenticated: boolean;
  selectedMethod: string;
  activeMethods: string[];
  paymentResult: AlpinePaymentResult | null | undefined;
  displayId: string | undefined;
  init: () => Promise<void>;
  selectAddress: (addr: AlpineCustomerAddress) => void;
  calculateTotal: () => void;
  loadPaymentMethods: () => Promise<void>;
  nextToPayment: () => Promise<void>;
  getMethodName: (method: string) => string;
  getGatewayIcon: (method: string) => string;
  getGatewayDesc: (method: string) => string;
  processPayment: () => Promise<void>;
}

interface LoginFormState {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  handleEmailLogin: () => Promise<void>;
  signInWithGoogle: () => void;
}

interface AuthCallbackState {
  loading: boolean;
  error: string;
  handleCallback: () => Promise<void>;
}

interface RegisterFormState {
  email: string;
  password: string;
  error: string;
  success: string;
  loading: boolean;
  handleRegister: () => Promise<void>;
  signInWithGoogle: () => void;
}

interface ProfilePageState {
  loading: boolean;
  profile: AlpineProfileData | null;
  activeTab: string;
  form: { name: string; phone: string };
  savingProfile: boolean;
  successMsg: string;
  errorMsg: string;
  pw: { newPassword: string; confirm: string };
  savingPw: boolean;
  pwSuccess: string;
  pwError: string;
  addresses: AlpineCustomerAddress[];
  loadingAddresses: boolean;
  addrError: string;
  showAddrForm: boolean;
  editingAddrId: string | null;
  savingAddr: boolean;
  addrForm: Omit<AlpineCustomerAddress, 'id'>;
  init: () => Promise<void>;
  saveProfile: () => Promise<void>;
  changePassword: () => Promise<void>;
  loadAddresses: () => Promise<void>;
  openAddressModal: (addr: AlpineCustomerAddress | null) => void;
  saveAddress: () => Promise<void>;
  makeDefault: (id: string) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  handleLogout: () => Promise<void>;
}

interface OrderListState {
  orders: AlpineOrderViewModel[];
  loading: boolean;
  init: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  formatDate: (dateStr: string) => string;
  getStatusLabel: (status: string) => string;
}

interface OrderDetailState {
  order: AlpineOrderViewModel | null;
  unsubscribe: (() => void) | null;
  loading: boolean;
  init: () => Promise<void>;
  fetchDetail: (orderId: string | undefined) => Promise<void>;
  formatDate: (dateStr: string) => string;
  formatFullDate: (dateStr: string) => string;
  getStatusLabel: (status: string) => string;
  getTrackingUrl: (carrier: string | null, trackingId: string | null) => string;
  destroyed: () => void;
}

// Window augmentation for Alpine.js component factories

interface Window {
  checkoutForm: () => CheckoutFormState;
  loginForm:    () => LoginFormState;
  authCallback: () => AuthCallbackState;
  profilePage:  () => ProfilePageState;
  registerForm: () => RegisterFormState;
  orderList:    () => OrderListState;
  orderDetail:  () => OrderDetailState;
}
