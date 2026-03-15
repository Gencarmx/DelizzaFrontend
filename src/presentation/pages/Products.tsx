import { useLoaderData, Link } from "react-router";
import { useAuth } from "@core/context/AuthContext";
import type { Product } from "@core/router/loaders/productsLoader";

export default function Products() {
  // useLoaderData obtiene los datos del loader
  const products = useLoaderData() as Product[];
  const { user } = useAuth();

  // Determinar el contexto de visualización
  // Nota: Ahora usamos el sistema de colaboradores, no solo owners
  const isAuthenticated = !!user;
  // Los colaboradores pueden ver productos de sus negocios asignados
  // Esta información vendrá del loader que filtra automáticamente

  // Si no hay productos, mostrar mensaje general
  // El loader ya maneja el filtrado automático basado en colaboradores
  if (!products || products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No hay productos disponibles
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Actualmente no se han registrado productos en la plataforma. Los restaurantes pueden agregar sus productos desde el panel de administración.
          </p>
          <div className="space-y-3">
            <Link
              to="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Ir al inicio
            </Link>
            {!isAuthenticated && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ¿Eres propietario de un restaurante?{" "}
                <Link to="/register-owner" className="text-blue-600 hover:text-blue-700 font-medium">
                  Regístrate aquí
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Productos Disponibles
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Descubre deliciosos productos de nuestros restaurantes asociados
          </p>
        </div>

        {/* Grid de productos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
            >
              {/* Imagen del producto */}
              <div className="aspect-square bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-product.png'; // Fallback image
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Información del producto */}
              <div className="p-4">
                {/* Restaurante */}
                {product.businesses && (
                  <div className="flex items-center space-x-2 mb-2">
                    {product.businesses.logo_url && (
                      <img
                        src={product.businesses.logo_url}
                        alt={product.businesses.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {product.businesses.name}
                    </span>
                  </div>
                )}

                {/* Nombre del producto */}
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                  {product.name}
                </h3>

                {/* Descripción */}
                {product.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* Precio */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    ${product.price.toFixed(2)}
                  </span>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors">
                    Ver detalles
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer con navegación */}
        <div className="mt-12 text-center">
          <Link
            to="/"
            className="inline-block bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
