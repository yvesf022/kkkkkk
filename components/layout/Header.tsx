<form
  onSubmit={(e) => {
    e.preventDefault();
    const q = e.currentTarget.search.value.trim();
    if (q) {
      router.push(`/store?search=${encodeURIComponent(q)}`);
    } else {
      router.push("/store");
    }
  }}
>
  <input
    name="search"
    placeholder="Search products"
    defaultValue=""
    style={{
      padding: "10px 14px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,.25)",
      background: "rgba(8,14,28,.6)",
      color: "#fff",
      outline: "none",
      minWidth: 220,
    }}
  />
</form>
