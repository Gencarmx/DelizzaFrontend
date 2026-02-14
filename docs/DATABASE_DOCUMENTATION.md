# 📚 Documentación Completa de Base de Datos

**Proyecto:** Delizza - Plataforma de Delivery de Comida  
**Fecha:** 2024  
**Base de Datos:** Supabase (PostgreSQL)

---

## 📑 Tabla de Contenidos

1. [Estructura de Tablas](#estructura-de-tablas)
2. [Relaciones entre Tablas](#relaciones-entre-tablas)
3. [Políticas RLS (Row Level Security)](#políticas-rls)
4. [Triggers y Funciones](#triggers-y-funciones)
5. [Índices y Optimizaciones](#índices-y-optimizaciones)
6. [Constraints y Validaciones](#constraints-y-validaciones)
7. [Guía de Uso](#guía-de-uso)

---

## 1. Estructura de Tablas

### 1.1 `profiles` - Perfiles de Usuario

**Propósito:** Almacena información de todos los usuarios del sistema.

| Columna | Tipo | Descripción | Constraints |
|---------|------|-------------|-------------|
| `id` | uuid | ID único del perfil | PRIMARY KEY |
| `user_id` | uuid | Referencia a auth.users | UNIQUE, FK → auth.users |
| `full_name` | text | Nombre completo | NOT NULL |
| `phone_number` | text | Número de teléfono | UNIQUE |
| `user_role` | text | Rol del usuario (client, owner, driver, seller) | NOT NULL |
| `active` | boolean | Estado del perfil | NOT NULL, DEFAULT true |
| `created_at` | timestamp | Fecha de creación | DEFAULT now() |
| `updated_at` | timestamp | Última actualización | DEFAULT now() |

**Roles Disponibles:**
- `client` - Cliente que realiza pedidos
- `owner` - Dueño de restaurante
- `driver` - Repartidor
- `seller` - Vendedor/empleado

---

### 1.2 `businesses` - Restaurantes/Negocios

**Propósito:** Almacena información de los restaurantes.

| Columna | Tipo | Descripción | Constraints |
|---------|------|-------------|-------------|
| `id` | uuid | ID único del negocio | PRIMARY KEY |
| `owner_id` | uuid | ID del dueño | FK → profiles(id) |
| `name` | text | Nombre del restaurante | NOT NULL |
| `address` | text | Dirección | NOT NULL |
| `phone` | text | Teléfono | UNIQUE, NOT NULL |
| `logo_url` | text | URL del logo | |
| `active` | boolean | Estado del negocio | NOT NULL, DEFAULT false |
| `created_at` | timestamp | Fecha de creación | DEFAULT now() |
| `updated_at` | timestamp | Última actualización | DEFAULT now() |

**Notas:**
- `active = false` por defecto (requiere aprobación)
- Un `owner` puede tener múltiples negocios
- El teléfono debe ser único

---

### 1.3 `products` - Productos

**Propósito:** Almacena los productos/platillos de cada restaurante.

| Columna | Tipo | Descripción | Constraints |
|---------|------|-------------|-------------|
| `id` | uuid | ID único del producto | PRIMARY KEY |
| `business_id` | uuid | ID del restaurante | FK → businesses(id) |
| `name` | text | Nombre del producto | NOT NULL |
| `description` | text | Descripción | |
| `price` | numeric | Precio | NOT NULL |
| `image_url` | text | URL de la imagen | |
| `stock` | integer | Cantidad en inventario | CHECK (stock >= 0) |
| `active` | boolean | Estado del producto | NOT NULL, DEFAULT true |
| `created_at` | timestamp | Fecha de creación | DEFAULT now() |
| `updated_at` | timestamp | Última actualización | DEFAULT now() |

**Notas:**
- `stock` debe ser >= 0
- Solo productos con `active = true` son visibles para clientes

---

### 1.4 `product_categories` - Categorías de Productos

**Propósito:** Categorías para organizar productos (Pizzas, Tacos, Bebidas, etc.).

| Columna | Tipo | Descripción | Constraints |
|---------|------|-------------|-------------|
| `id` | uuid | ID único de categoría | PRIMARY KEY |
| `name` | text | Nombre de la categoría | UNIQUE, NOT NULL |
| `icon` | text | Emoji o icono | NOT NULL |
| `sort_order` | integer | Orden de visualización | DEFAULT 0 |
| `active` | boolean | Estado de la categoría | NOT NULL, DEFAULT true |
| `created_at` | timestamp | Fecha de creación | DEFAULT now() |
| `updated_at` | timestamp | Última actualización | DEFAULT now() |

---

### 1.5 `orders` - Órdenes/Pedidos

**Propósito:** Almacena los pedidos realizados por clientes.

| Columna | Tipo | Descripción | Constraints |
|---------|------|-------------|-------------|
| `id` | uuid | ID único de la orden | PRIMARY KEY |
| `customer_id` | uuid | ID del cliente | FK → profiles(id) |
| `business_id` | uuid | ID del restaurante | FK → businesses(id) |
| `assigned_driver_id` | uuid | ID del repartidor | FK → profiles(id) |
| `status` | text | Estado del pedido | CHECK (valores específicos) |
| `delivery_type` | text | Tipo de entrega | CHECK (PICKUP, DELIVERY) |
| `delivery_address` | text | Dirección de entrega | |
| `payment_method` | text | Método de pago | CHECK (CASH, CARD, TRANSFER) |
| `subtotal` | numeric | Subtotal | NOT NULL |
| `delivery_fee` | numeric | Costo de envío | DEFAULT 0 |
| `total` | numeric | Total | NOT NULL |
| `notes` | text | Notas especiales | |
| `created_at` | timestamp | Fecha de creación | DEFAULT now() |
| `updated_at` | timestamp | Última actualización | DEFAULT now() |

**Estados de Orden:**
- `PENDING` - Pendiente de confirmación
- `CONFIRMED` - Confirmado por el restaurante
- `PREPARING` - En preparación
- `READY` - Listo para recoger/entregar
- `IN_DELIVERY` - En camino
- `DELIVERED` - Entregado
- `CANCELLED` - Cancelado

**Tipos de Entrega:**
- `PICKUP` - Recoger en restaurante
- `DELIVERY` - Envío a domicilio

**Métodos de Pago:**
- `CASH` - Efectivo
- `CARD` - Tarjeta
- `TRANSFER` - Transferencia

---

### 1.6 `order_items` - Items de Orden

**Propósito:** Detalle de productos en cada orden.

| Columna | Tipo | Descripción | Constraints |
|---------|------|-------------|-------------|
| `id` | uuid | ID único del item | PRIMARY KEY |
| `order_id` | uuid | ID de la orden | FK → orders(id) CASCADE |
| `product_id` | uuid | ID del producto | FK → products(id) |
| `quantity` | integer | Cantidad | NOT NULL |
| `unit_price` | numeric | Precio unitario | NOT NULL |
| `subtotal` | numeric | Subtotal del item | NOT NULL |
| `notes` | text | Notas especiales | |

---

### 1.7 `business_hours` - Horarios de Negocio

**Propósito:** Horarios de apertura/cierre de restaurantes.

| Columna | Tipo | Descripción | Constraints |
|---------|------|-------------|-------------|
| `id` | uuid | ID único | PRIMARY KEY |
| `business_id` | uuid | ID del restaurante | FK → businesses(id) CASCADE |
| `day_of_week` | integer | Día de la semana (0-6) | CHECK (0-6) |
| `open_time` | time | Hora de apertura | NOT NULL |
| `close_time` | time | Hora de cierre | NOT NULL |
| `active` | boolean | Estado del horario | NOT NULL, DEFAULT true |

**Días de la Semana:**
- 0 = Domingo
- 1 = Lunes
- 2 = Martes
- 3 = Miércoles
- 4 = Jueves
- 5 = Viernes
- 6 = Sábado

**Constraint:** `open_time` debe ser menor que `close_time`

---

### 1.8 `collaborators` - Colaboradores

**Propósito:** Empleados/colaboradores de restaurantes.

| Columna | Tipo | Descripción | Constraints |
|---------|------|-------------|-------------|
| `id` | uuid | ID único | PRIMARY KEY |
| `business_id` | uuid | ID del restaurante | FK → businesses(id) |
| `user_id` | uuid | ID del usuario | FK → profiles(id) |
| `role` | text | Rol del colaborador | CHECK (owner, seller) |
| `status` | text | Estado | CHECK (active, inactive, pending) |
| `invited_by` | uuid | Quién invitó | FK → profiles(id) |
| `active` | boolean | Estado activo | NOT NULL, DEFAULT true |
| `created_at` | timestamp | Fecha de creación | DEFAULT now() |

**Roles de Colaborador:**
- `owner` - Dueño
- `seller` - Vendedor/empleado

**Estados:**
- `active` - Activo
- `inactive` - Inactivo
- `pending` - Pendiente de aceptación

---

### 1.9 `payments` - Pagos

**Propósito:** Registro de pagos de órdenes.

| Columna | Tipo | Descripción | Constraints |
|---------|------|-------------|-------------|
| `id` | uuid | ID único | PRIMARY KEY |
| `order_id` | uuid | ID de la orden | FK → orders(id) CASCADE |
| `amount` | numeric | Monto | NOT NULL |
| `method` | text | Método de pago | CHECK (CASH, CARD, TRANSFER) |
| `status` | text | Estado del pago | CHECK (PENDING, COMPLETED, FAILED) |
| `transaction_id` | text | ID de transacción | |
| `created_at` | timestamp | Fecha de creación | DEFAULT now() |

---

## 2. Relaciones entre Tablas

### Diagrama de Relaciones

```
profiles (usuarios)
    ├─→ businesses (owner_id)
    │       ├─→ products (business_id)
    │       ├─→ business_hours (business_id)
    │       ├─→ orders (business_id)
    │       └─→ collaborators (business_id)
    │
    ├─→ orders (customer_id)
    │       ├─→ order_items (order_id)
    │       └─→ payments (order_id)
    │
    ├─→ orders (assigned_driver_id)
    └─→ collaborators (user_id, invited_by)

product_categories
    └─→ (relación futura con products)
```

### Relaciones Detalladas

| Tabla Origen | Columna | Tabla Destino | Columna | ON DELETE |
|--------------|---------|---------------|---------|-----------|
| profiles | user_id | auth.users | id | CASCADE |
| businesses | owner_id | profiles | id | NO ACTION |
| products | business_id | businesses | id | NO ACTION |
| business_hours | business_id | businesses | id | CASCADE |
| orders | customer_id | profiles | id | NO ACTION |
| orders | business_id | businesses | id | NO ACTION |
| orders | assigned_driver_id | profiles | id | NO ACTION |
| order_items | order_id | orders | id | CASCADE |
| order_items | product_id | products | id | NO ACTION |
| payments | order_id | orders | id | CASCADE |
| collaborators | business_id | businesses | id | NO ACTION |
| collaborators | user_id | profiles | id | NO ACTION |
| collaborators | invited_by | profiles | id | NO ACTION |

---

## 3. Políticas RLS (Row Level Security)

### 3.1 Políticas de `profiles`

#### SELECT - Ver
---

