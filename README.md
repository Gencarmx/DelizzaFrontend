# Dlizza Frontend

Aplicación web progresiva (PWA) construida con React, TypeScript y Vite, siguiendo los principios de **Clean Architecture** para garantizar un código escalable, mantenible y testeable.

## 🏗️ Arquitectura del Proyecto

Este proyecto implementa **Clean Architecture**, organizando el código en capas con responsabilidades bien definidas y reglas de dependencia claras.

### Estructura de Carpetas

```
src/
├── core/                          # 🎯 Capa de Negocio (Innermost Layer)
│   ├── domain/                    # Entidades y reglas de negocio empresariales
│   │   ├── entities/              # Entidades del dominio
│   │   ├── value-objects/         # Objetos de valor
│   │   └── interfaces/            # Contratos del dominio
│   └── application/               # Casos de uso y lógica de aplicación
│       ├── use-cases/             # Casos de uso
│       ├── ports/                 # Puertos (interfaces) Input/Output
│       └── dto/                   # Data Transfer Objects
│
├── infrastructure/                # 🔌 Capa de Infraestructura
│   ├── api/                       # Clientes API y configuración HTTP
│   ├── services/                  # Implementaciones de servicios externos
│   ├── storage/                   # LocalStorage, SessionStorage, IndexedDB
│   └── pwa/                       # Lógica específica de PWA
│
├── presentation/                  # 🎨 Capa de Presentación
│   ├── components/                # Componentes React
│   │   ├── common/                # Componentes reutilizables
│   │   ├── layout/                # Componentes de layout
│   │   └── features/              # Componentes específicos de features
│   ├── pages/                     # Páginas/Vistas de la aplicación
│   ├── hooks/                     # Custom React Hooks
│   ├── context/                   # React Context Providers
│   ├── routes/                    # Configuración de rutas
│   └── styles/                    # Estilos globales y temas
│
├── shared/                        # 🔧 Utilidades Compartidas
│   ├── utils/                     # Funciones utilitarias
│   ├── constants/                 # Constantes de la aplicación
│   ├── types/                     # Tipos TypeScript compartidos
│   └── config/                    # Archivos de configuración
│
└── assets/                        # 📦 Recursos estáticos
    └── images/                    # Imágenes y logos
```

### Reglas de Dependencia

```
Presentation → Infrastructure → Core
     ↓              ↓              ↓
  (UI Layer)   (External)    (Business Logic)
```

**Principio fundamental**: Las capas internas no deben conocer las capas externas. La lógica de negocio (`core`) es independiente de frameworks y UI.

### Path Aliases

El proyecto utiliza path aliases para imports más limpios:

```typescript
import Home from "@presentation/pages/Home";
import { useAuth } from "@presentation/hooks/useAuth";
import { User } from "@core/domain/entities/User";
import { apiClient } from "@infrastructure/api/http/client";
import { formatDate } from "@shared/utils/formatters";
```

## 🚀 Instalación

### Requisitos Previos

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 o **bun** >= 1.0.0

### Pasos de Instalación

1. **Clonar el repositorio**

   ```bash
   git clone <repository-url>
   cd dlizza-frontend
   ```

2. **Instalar dependencias**

   Con npm:

   ```bash
   npm install
   ```

   Con bun:

   ```bash
   bun install
   ```

3. **Configurar variables de entorno** (opcional)

   ```bash
   cp .env.example .env
   ```

   Edita el archivo `.env` con tus configuraciones.

4. **Iniciar el servidor de desarrollo**

   Con npm:

   ```bash
   npm run dev
   ```

   Con bun:

   ```bash
   bun dev
   ```

5. **Abrir en el navegador**

   La aplicación estará disponible en `http://localhost:5173`

## 📜 Scripts Disponibles

| Script                       | Descripción                              |
| ---------------------------- | ---------------------------------------- |
| `npm run dev`                | Inicia el servidor de desarrollo con HMR |
| `npm run build`              | Genera el build de producción            |
| `npm run preview`            | Previsualiza el build de producción      |
| `npm run lint`               | Ejecuta ESLint para verificar el código  |
| `npm run generate-pwa-icons` | Genera iconos PWA en diferentes tamaños  |

## 🛠️ Stack Tecnológico

- **React 19** - Librería UI
- **TypeScript 5.9** - Tipado estático
- **Vite 7** - Build tool y dev server
- **PWA** - Progressive Web App con service workers
- **ESLint** - Linting y calidad de código
- **CSS Modules** - Estilos con scope local

## 📱 PWA (Progressive Web App)

Esta aplicación es una PWA completamente funcional que incluye:

- ✅ **Instalable** en dispositivos móviles y desktop
- ✅ **Offline-first** con service workers
- ✅ **Actualizaciones automáticas** cada hora
- ✅ **Notificaciones** cuando hay nuevo contenido disponible

### Generar Iconos PWA

Para generar todos los iconos necesarios para la PWA:

```bash
npm run generate-pwa-icons
```

## 🧪 Verificación del Proyecto

### Verificar TypeScript

```bash
npx tsc --noEmit
```

### Verificar Linting

```bash
npm run lint
```

### Build de Producción

```bash
npm run build
```

Los archivos generados estarán en la carpeta `dist/`.

## 📚 Recursos Adicionales

- [Clean Architecture - Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y propietario.
