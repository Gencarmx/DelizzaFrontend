# 📚 Documentación Completa de Base de Datos - Delizza

**Proyecto:** Delizza - Plataforma de Delivery de Comida  
**Motor:** Supabase (PostgreSQL)  
**Última Actualización:** Marzo 2026

---

## 📑 Tabla de Contenidos

1. [Estructura de Tablas](#1-estructura-de-tablas)
2. [Relaciones (Llaves Foráneas)](#2-relaciones-llaves-foráneas)
3. [Triggers y Funciones](#3-triggers-y-funciones)
4. [Políticas de Seguridad (RLS)](#4-políticas-de-seguridad-rls)

---

## 1. Estructura de Tablas

### 1.1 `profiles` (Perfiles de Usuario)
| Columna | Tipo | Nulo | Valor por Defecto |
|---------|------|------|--------------------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | YES | |
| `phone_number` | varchar | YES | |
| `full_name` | varchar | YES | |
| `user_role` | text | YES | |
| `active` | boolean | YES | `true` |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |

### 1.2 `businesses` (Negocios/Restaurantes)
| Columna | Tipo | Nulo | Valor por Defecto |
|---------|------|------|--------------------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `owner_id` | uuid | NO | |
| `owner_user_id` | uuid | YES | |
| `name` | varchar | NO | |
| `logo_url` | text | YES | |
| `address` | text | YES | |
| `phone` | text | YES | |
| `active` | boolean | YES | `true` |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |

### 1.3 `products` (Platillos/Productos)
| Columna | Tipo | Nulo | Valor por Defecto |
|---------|------|------|-------------------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `business_id` | uuid | NO | |
| `category_id` | uuid | NO | |
| `name` | varchar | NO | |
| `description` | text | YES | |
| `price` | numeric | NO | |
| `stock` | integer | NO | `0` |
| `image_url` | text | YES | |
| `active` | boolean | YES | `true` |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |

### 1.4 `product_categories` (Categorías)
| Columna | Tipo | Nulo | Valor por Defecto |
|---------|------|------|-------------------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `name` | varchar | NO | |
| `icon` | varchar | YES | |
| `description` | text | YES | |
| `sort_order` | integer | YES | `0` |
| `active` | boolean | YES | `true` |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |

### 1.5 `orders` (Pedidos)
| Columna | Tipo | Nulo | Valor por Defecto |
|---------|------|------|-------------------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `customer_id` | uuid | YES | |
| `customer_name` | text | YES | |
| `business_id` | uuid | YES | |
| `assigned_driver_id` | uuid | YES | |
| `delivery_type` | text | YES | |
| `payment_method` | text | YES | |
| `total` | numeric | NO | |
| `status` | text | YES | |
| `active` | boolean | YES | `true` |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |

### 1.6 `order_items` (Detalle de Pedido)
| Columna | Tipo | Nulo | Valor por Defecto |
|---------|------|------|-------------------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `order_id` | uuid | YES | |
| `product_id` | uuid | YES | |
| `product_name` | text | YES | |
| `quantity` | integer | NO | |
| `price` | numeric | NO | |
| `active` | boolean | YES | `true` |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |

### 1.7 `addresses` (Direcciones de Clientes)
| Columna | Tipo | Nulo | Valor por Defecto |
|---------|------|------|-------------------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `profile_id` | uuid | NO | |
| `label` | text | YES | |
| `recipient_name` | text | YES | |
| `phone` | text | YES | |
| `line1` | text | NO | |
| `line2` | text | YES | |
| `city` | text | NO | `'Izamal'::text` |
| `state` | text | YES | `'Yucatán'::text` |
| `postal_code` | text | YES | `97460` |
| `country` | text | NO | `'MX'::text` |
| `is_default` | boolean | YES | `false` |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |

### 1.8 `collaborators` (Colaboradores de Negocio)
| Columna | Tipo | Nulo | Valor por Defecto |
|---------|------|------|-------------------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | YES | |
| `business_id` | uuid | YES | |
| `role` | text | YES | |
| `status` | text | YES | |
| `invited_by` | uuid | YES | |
| `active` | boolean | YES | `true` |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |

### 1.9 `business_hours` (Horarios)
| Columna | Tipo | Nulo | Valor por Defecto |
|---------|------|------|-------------------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `business_id` | uuid | NO | |
| `day_of_week` | smallint | NO | |
| `open_time` | time | NO | |
| `close_time` | time | NO | |
| `active` | boolean | NO | `true` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

---

## 2. Relaciones (Llaves Foráneas)

| Tabla Origen | Columna Origen | Tabla Destino | Columna Destino | Nombre Relación |
|--------------|----------------|---------------|-----------------|-----------------|
| `addresses` | `profile_id` | `profiles` | `id` | `addresses_profile_id_fkey` |
| `business_hours` | `business_id` | `businesses` | `id` | `fk_business_hours_business` |
| `businesses` | `owner_id` | `profiles` | `id` | `businesses_owner_id_fkey` |
| `collaborators` | `business_id` | `businesses` | `id` | `collaborators_bus_id_fkey` |
| `collaborators` | `user_id` | `profiles` | `id` | `collaborators_user_id_fkey` |
| `order_items` | `order_id` | `orders` | `id` | `order_items_order_id_fkey` |
| `order_items` | `product_id` | `products` | `id` | `order_items_product_id_fkey` |
| `orders` | `business_id` | `businesses` | `id` | `orders_business_id_fkey` |
| `orders` | `customer_id` | `profiles` | `id` | `orders_customer_id_fkey` |
| `products` | `business_id` | `businesses` | `id` | `products_business_id_fkey` |
| `products` | `category_id` | `product_categories` | `id` | `products_category_id_fkey` |

---

## 3. Triggers y Funciones

### Funciones SQL Destacadas
- **`handle_new_user()`**: Trigger en `auth.users` que mapea usuarios de Google/Email a `public.profiles`.
- **`handle_new_business()`**: Crea automáticamente una entrada en `businesses` cuando un perfil con rol 'owner' es creado.
- **`get_my_profile_id()`**: Función auxiliar para obtener el ID del perfil basado en `auth.uid()`.

### Triggers Implementados
| Tabla | Nombre | Evento | Acción |
|-------|--------|--------|--------|
| `addresses` | `trg_addresses_updated` | BEFORE UPDATE | Setea `updated_at = now()` |
| `profiles` | `trigger_handle_new_business` | AFTER INSERT | Ejecuta `handle_new_business()` |
| `product_categories`| `trigger_update_updated_at` | BEFORE UPDATE | Setea `updated_at = now()` |

---

## 4. Políticas de Seguridad (RLS)

### 4.1 Políticas de `addresses`
- **SELECT**: Usuarios ven sus direcciones. Owners ven direcciones de clientes en sus pedidos.
- **INSERT/UPDATE/DELETE**: Solo el dueño de la dirección.

### 4.2 Políticas de `businesses`
- **SELECT**: Público ve activos. Owners ven sus propios negocios.
- **INSERT/UPDATE/DELETE**: Propietarios autenticados (Owners).

### 4.3 Políticas de `products`
- **SELECT**: Público ve activos. Owners ven sus productos.
- **INSERT/UPDATE/DELETE**: Owners y Colaboradores activos del negocio.

### 4.4 Políticas de `orders`
- **INSERT**: Clientes autenticados.
- **SELECT**: Clientes ven sus pedidos. Owners ven pedidos de su negocio. Repartidores ven sus asignados.
- **UPDATE**: Owners y Repartidores (solo estados permitidos).

### 4.5 Políticas de `profiles`
- **SELECT**: Público puede ver nombres básicos.
- **UPDATE**: Solo el dueño del perfil.
