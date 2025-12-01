// Tipo para los datos del loader
export interface Product {
  id: number;
  title: string;
  price: number;
}

// Loader function - se ejecuta antes de renderizar el componente
export async function productsLoader(): Promise<Product[]> {
  // Simulamos una llamada a API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, title: "Product 1", price: 29.99 },
        { id: 2, title: "Product 2", price: 49.99 },
        { id: 3, title: "Product 3", price: 19.99 },
      ]);
    }, 500);
  });
}
