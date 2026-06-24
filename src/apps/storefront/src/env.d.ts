/// <reference types="astro/client" />

interface GalleryStoreState {
  images: string[];
  productName: string;
  activeIdx: number;
  lightboxOpen: boolean;
  $el?: HTMLElement;
  init: () => void;
  setActive: (idx: number) => void;
  openLightbox: () => void;
  closeLightbox: () => void;
  prevImage: () => void;
  nextImage: () => void;
}

interface Window {
  galleryStore: () => GalleryStoreState;
}
