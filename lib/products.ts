export type Product = {
  id: string;
  title: string;
  category: string;
  price: number;
  oldPrice?: number;
  rating: number;
  img: string;
  desc?: string;
};

export const products: Product[] = [
  // ✅ BEAUTY
  {
    id: "beauty-01",
    title: "Beauty Kit (Glow Set)",
    category: "beauty",
    price: 180,
    oldPrice: 250,
    rating: 4.8,
    img: "/products/beauty1.jpeg",
    desc: "Premium beauty glow set for daily skincare & shine.",
  },
  {
    id: "beauty-02",
    title: "Makeup Essentials Pack",
    category: "beauty",
    price: 220,
    oldPrice: 300,
    rating: 4.7,
    img: "/products/beauty2.jpeg",
    desc: "Makeup essentials bundle: smooth finish + long lasting.",
  },

  // ✅ MOBILE
  {
    id: "mobile-01",
    title: "Mobile Accessories Bundle",
    category: "mobile",
    price: 150,
    oldPrice: 200,
    rating: 4.6,
    img: "/products/mobile1.jpeg",
    desc: "Fast charging + accessories combo for your phone.",
  },
  {
    id: "mobile-02",
    title: "Premium Phone Add-ons Pack",
    category: "mobile",
    price: 170,
    oldPrice: 230,
    rating: 4.5,
    img: "/products/mobile2.jpeg",
    desc: "Clean sleek add-ons bundle, fits modern devices.",
  },

  // ✅ FASHION
  {
    id: "fashion-01",
    title: "Fashion Streetwear Outfit",
    category: "fashion",
    price: 320,
    oldPrice: 420,
    rating: 4.9,
    img: "/products/fashion1.jpeg",
    desc: "Fresh streetwear look: stylish and comfortable.",
  },
  {
    id: "fashion-02",
    title: "Classic Fashion Wear",
    category: "fashion",
    price: 280,
    oldPrice: 360,
    rating: 4.6,
    img: "/products/fashion2.jpeg",
    desc: "A classic fashion piece for everyday style.",
  },

  /**
   * ✅ To show at least 12 products on homepage,
   * we duplicate products with different IDs/titles (same images)
   * until you add more real product photos.
   */
  // Beauty duplicates
  {
    id: "beauty-03",
    title: "Skincare Glow Pack",
    category: "beauty",
    price: 190,
    rating: 4.7,
    img: "/products/beauty1.jpeg",
  },
  {
    id: "beauty-04",
    title: "Beauty Essentials (Combo)",
    category: "beauty",
    price: 210,
    rating: 4.6,
    img: "/products/beauty2.jpeg",
  },

  // Mobile duplicates
  {
    id: "mobile-03",
    title: "Phone Accessories Kit",
    category: "mobile",
    price: 160,
    rating: 4.5,
    img: "/products/mobile1.jpeg",
  },
  {
    id: "mobile-04",
    title: "Phone Add-ons (Bundle)",
    category: "mobile",
    price: 175,
    rating: 4.4,
    img: "/products/mobile2.jpeg",
  },

  // Fashion duplicates
  {
    id: "fashion-03",
    title: "Streetwear Collection",
    category: "fashion",
    price: 340,
    rating: 4.8,
    img: "/products/fashion1.jpeg",
  },
  {
    id: "fashion-04",
    title: "Elegant Fashion Outfit",
    category: "fashion",
    price: 300,
    rating: 4.6,
    img: "/products/fashion2.jpeg",
  },
];
