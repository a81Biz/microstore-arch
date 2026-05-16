export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  slug: string;
  imageUrl?: string | null;
}

type CartStoreDefinition = {
  items: CartItem[];
  open: boolean;
  init(): void;
  add(product: Omit<CartItem, 'quantity'>, qty: number): void;
  remove(productId: string): void;
  updateQty(productId: string, delta: number): void;
  clear(): void;
  count: number;
  subtotal: number;
  _load(): void;
  _save(): void;
  _toCheckoutUrl(baseUrl: string): string;
};

export function registerCartStore(): void {
  const alpine = (window as unknown as { Alpine: { store(name: string, obj: CartStoreDefinition): void } }).Alpine;

  const cartStore: CartStoreDefinition = {
    items: [],
    open: false,

    init() {
      this._load();
    },

    add(product, qty) {
      const existing = this.items.find((i) => i.productId === product.productId);
      if (existing) {
        existing.quantity += qty;
      } else {
        if (this.items.length >= 15) return;
        this.items.push({ ...product, quantity: qty });
      }
      this._save();
    },

    remove(productId) {
      this.items = this.items.filter((i) => i.productId !== productId);
      this._save();
    },

    updateQty(productId, delta) {
      const item = this.items.find((i) => i.productId === productId);
      if (!item) return;
      item.quantity = Math.max(1, item.quantity + delta);
      this._save();
    },

    clear() {
      this.items = [];
      this._save();
    },

    get count() {
      return this.items.reduce((s, i) => s + i.quantity, 0);
    },

    get subtotal() {
      return this.items.reduce((s, i) => s + i.price * i.quantity, 0);
    },

    _load() {
      try {
        const raw = localStorage.getItem('cart');
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) this.items = parsed as CartItem[];
        }
      } catch {
        this.items = [];
      }
    },

    _save() {
      try {
        localStorage.setItem('cart', JSON.stringify(this.items));
      } catch { /* storage quota exceeded */ }
    },

    _toCheckoutUrl(baseUrl) {
      try {
        return `${baseUrl}/checkout?cart=${encodeURIComponent(JSON.stringify(this.items))}`;
      } catch {
        return `${baseUrl}/checkout`;
      }
    },
  };

  alpine.store('cart', cartStore);
}
