interface Props {
  stock: number;
}

export default function StockIndicator({ stock }: Props) {
  if (stock > 10) {
    return <div style={{ color: "#16a34a", fontWeight: 700 }}>In Stock</div>;
  }

  if (stock > 0) {
    return (
      <div style={{ color: "#dc2626", fontWeight: 800 }}>
        Only {stock} left — order soon
      </div>
    );
  }

  return (
    <div style={{ color: "#991b1b", fontWeight: 900 }}>
      Out of Stock
    </div>
  );
}
