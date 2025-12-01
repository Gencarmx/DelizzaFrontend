import { useLoaderData, Link } from "react-router";
import type { Product } from "@core/router/loaders/productsLoader";

export default function Products() {
  // useLoaderData obtiene los datos del loader
  const products = useLoaderData() as Product[];

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Products</h1>
      <p>Esta página demuestra el uso de loaders en React Router v7</p>

      <div style={{ marginTop: "2rem" }}>
        {products.map((product) => (
          <div
            key={product.id}
            style={{
              padding: "1rem",
              marginBottom: "1rem",
              border: "1px solid #ccc",
              borderRadius: "8px",
            }}
          >
            <h3>{product.title}</h3>
            <p>Price: ${product.price}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Link to="/">Back to Home</Link>
      </div>
    </div>
  );
}
