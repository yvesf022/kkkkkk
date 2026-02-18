"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { productsApi } from "@/lib/api";
import ProductCard from "@/components/store/ProductCard";
import type { ProductListItem } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await productsApi.list({
          page: 1,
          per_page: 8,
        });
        setProducts(data?.results ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      {/* ================= HERO SECTION - BEAST MODE ================= */}
      <section
        style={{
          position: "relative",
          minHeight: "85vh",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          background: "linear-gradient(135deg, #0033a0 0%, #004b7a 50%, #009543 100%)",
        }}
      >
        {/* Animated Background Pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.1,
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px),
              repeating-linear-gradient(-45deg, transparent, transparent 35px, rgba(255,255,255,.05) 35px, rgba(255,255,255,.05) 70px)
            `,
          }}
        />

        {/* Floating Decorative Elements */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            right: "5%",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
            animation: "float 6s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            left: "8%",
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,149,67,0.2) 0%, transparent 70%)",
            animation: "float 8s ease-in-out infinite",
          }}
        />

        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 500px), 1fr))",
              gap: 60,
              alignItems: "center",
            }}
          >
            {/* LEFT: HERO CONTENT */}
            <div style={{ textAlign: "left" }}>
              {/* LESOTHO FLAG BADGE - Small & Elegant */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  marginBottom: 24,
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: 30,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  animation: "slideInLeft 0.8s ease-out",
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>🇱🇸</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#111",
                    letterSpacing: 0.5,
                  }}
                >
                  Lesotho Premium Boutique
                </span>
              </div>

              {/* MAIN HEADLINE */}
              <h1
                style={{
                  fontSize: "clamp(42px, 8vw, 72px)",
                  fontWeight: 900,
                  lineHeight: 1.1,
                  marginBottom: 24,
                  color: "#fff",
                  textShadow: "0 4px 20px rgba(0,0,0,0.3)",
                  animation: "slideInLeft 0.8s ease-out 0.2s backwards",
                }}
              >
                Discover Your
                <br />
                <span
                  style={{
                    background: "linear-gradient(90deg, #fff 0%, #d4af37 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Signature Style
                </span>
              </h1>

              {/* SUBTITLE */}
              <p
                style={{
                  fontSize: "clamp(16px, 2.5vw, 20px)",
                  lineHeight: 1.7,
                  marginBottom: 40,
                  color: "rgba(255,255,255,0.95)",
                  maxWidth: 560,
                  textShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  animation: "slideInLeft 0.8s ease-out 0.4s backwards",
                }}
              >
                Curated fashion and beauty collections crafted for elegance,
                confidence, and the modern lifestyle. Experience luxury that
                celebrates African heritage.
              </p>

              {/* CTA BUTTONS */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                  animation: "slideInLeft 0.8s ease-out 0.6s backwards",
                }}
              >
                <button
                  onClick={() => router.push("/store")}
                  style={{
                    padding: "18px 40px",
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#0033a0",
                    background: "#fff",
                    border: "none",
                    borderRadius: 50,
                    cursor: "pointer",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                    transition: "all 0.3s ease",
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px) scale(1.05)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
                  }}
                >
                   Shop Now
                </button>

                <button
                  onClick={() => router.push("/store")}
                  style={{
                    padding: "18px 40px",
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#fff",
                    background: "rgba(255,255,255,0.15)",
                    border: "2px solid rgba(255,255,255,0.6)",
                    borderRadius: 50,
                    cursor: "pointer",
                    backdropFilter: "blur(10px)",
                    transition: "all 0.3s ease",
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                   Explore Collection
                </button>
              </div>

              {/* TRUST BADGES */}
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  marginTop: 48,
                  flexWrap: "wrap",
                  animation: "fadeIn 1s ease-out 0.8s backwards",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>✓</span>
                  <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
                    Premium Quality
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>✓</span>
                  <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
                    Fast Delivery
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>✓</span>
                  <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
                    Secure Checkout
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT: PRODUCT SHOWCASE */}
            {!loading && products.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 16,
                  animation: "slideInRight 0.8s ease-out 0.4s backwards",
                }}
              >
                {products.slice(0, 4).map((product, idx) => {
                  // Format price with Maloti (M) currency
                  const formatPrice = (price: string | number) => {
                    if (typeof price === 'string') {
                      const cleanPrice = price.replace(/[^0-9.]/g, '');
                      return `M ${cleanPrice}`;
                    }
                    return `M ${price.toFixed(2)}`;
                  };

                  return (
                    <div
                      key={product.id}
                      onClick={() => router.push(`/store/product/${product.id}`)}
                      style={{
                        background: "#fff",
                        borderRadius: 20,
                        overflow: "hidden",
                        cursor: "pointer",
                        boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        animation: `fadeInScale 0.6s ease-out ${0.6 + idx * 0.1}s backwards`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-12px) scale(1.05)";
                        e.currentTarget.style.boxShadow = "0 20px 60px rgba(0,0,0,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0) scale(1)";
                        e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.2)";
                      }}
                    >
                      <div
                        style={{
                          aspectRatio: "1",
                          backgroundImage: product.main_image
                            ? `url(${product.main_image})`
                            : "linear-gradient(135deg, #e0e0e0, #f5f5f5)",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(0,0,0,0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: 0,
                            transition: "opacity 0.3s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        >
                          <span
                            style={{
                              padding: "8px 16px",
                              background: "#fff",
                              borderRadius: 20,
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#111",
                            }}
                          >
                            Quick View
                          </span>
                        </div>
                      </div>

                      <div style={{ padding: 16 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#111",
                            marginBottom: 6,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {product.title}
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 900,
                            background: "linear-gradient(135deg, #0033a0, #009543)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                          }}
                        >
                          {formatPrice(product.price)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            animation: "bounce 2s ease-in-out infinite",
          }}
        >
          <div
            style={{
              width: 30,
              height: 50,
              border: "3px solid rgba(255,255,255,0.5)",
              borderRadius: 20,
              position: "relative",
            }}
          >
            <div
              style={{
                width: 6,
                height: 10,
                background: "#fff",
                borderRadius: 3,
                position: "absolute",
                top: 8,
                left: "50%",
                transform: "translateX(-50%)",
                animation: "scrollDown 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-60px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(60px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.9);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes float {
            0%,
            100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-20px);
            }
          }

          @keyframes bounce {
            0%,
            100% {
              transform: translateX(-50%) translateY(0);
            }
            50% {
              transform: translateX(-50%) translateY(-10px);
            }
          }

          @keyframes scrollDown {
            0% {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
            100% {
              opacity: 0;
              transform: translateX(-50%) translateY(20px);
            }
          }
        `}</style>
      </section>

      {/* ================= FEATURED COLLECTION ================= */}
      <section
        style={{
          padding: "100px 0",
          background: "linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 60,
              flexWrap: "wrap",
              gap: 24,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 2,
                  color: "#009543",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Handpicked For You
              </div>
              <h2
                style={{
                  fontSize: "clamp(32px, 5vw, 48px)",
                  fontWeight: 900,
                  color: "#111",
                  margin: 0,
                }}
              >
                Featured Collection
              </h2>
            </div>

            <button
              onClick={() => router.push("/store")}
              style={{
                padding: "14px 32px",
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                background: "linear-gradient(135deg, #0033a0, #009543)",
                border: "none",
                borderRadius: 50,
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(0,51,160,0.3)",
                transition: "all 0.3s ease",
                letterSpacing: 0.5,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,51,160,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,51,160,0.3)";
              }}
            >
              View All Products →
            </button>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}