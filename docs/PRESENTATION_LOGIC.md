# Presentation Logic Layer

## Overview

The `src/presentation/logic/` folder contains files dedicated to the logic necessary for application functionalities within the presentation layer. This folder serves to separate business logic, data fetching, state management, and view-specific logic from the UI components themselves.

## Purpose

This layer exists to:
- Maintain clean separation between UI and logic
- Improve code reusability and testability
- Centralize view-related business logic
- Follow the Single Responsibility Principle

## File Types

### Custom Hooks
Files containing React hooks that encapsulate logic for:
- Data fetching and caching
- Form state management
- UI state handling
- Side effects management

### View Models
Classes or functions that represent the data and behavior of specific views:
- Data transformation logic
- View state management
- Business rules for UI interactions

### Service Functions
Utility functions for view-specific operations:
- Data validation
- UI calculations
- View-specific helpers

### Loaders
Functions that handle data loading for specific routes/views:
- API calls for initial data
- Data preprocessing
- Error handling for data fetching

## Naming Convention

### Logic Files for View Components
Files containing logic separated from view components must follow this exact naming convention:

**Format:** `{ComponentName}Logic.{extension}`

**Examples:**
- View file: `EditProfile.tsx` → Logic file: `EditProfileLogic.ts`
- View file: `UserProfile.tsx` → Logic file: `UserProfileLogic.ts`
- View file: `ProductList.tsx` → Logic file: `ProductListLogic.ts`

**Rules:**
- The logic file name must be identical to the view file name
- Add "Logic" immediately before the file extension
- No additional separators or changes to the base name
- Maintain the same file extension (typically `.ts` for TypeScript logic files)

This convention ensures:
- Easy identification of related files
- Consistent project structure
- Clear separation between UI and logic
- Simplified imports and exports

### Other Logic Files
- Files should be named descriptively: `useProfileData.ts`, `ProfileViewModel.ts`
- Custom hooks should start with `use`: `useProductList.ts`
- View models should end with `ViewModel`: `DashboardViewModel.ts`

## Usage Example

```typescript
// src/presentation/logic/useProfileData.ts
import { useState, useEffect } from 'react';
import { supabase } from '@core/supabase/client';

export function useProfileData(userId: string) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    // Logic here
  };

  return { profile, loading, refetch: fetchProfile };
}
```

## Import/Export

All logic files should be exported from `src/presentation/logic/index.ts` for clean imports:

```typescript
export { useProfileData } from './useProfileData';
export { ProfileViewModel } from './ProfileViewModel';
```

## Best Practices

1. **Single Responsibility**: Each file should handle one specific concern
2. **Reusability**: Logic should be written to be reusable across components
3. **Testing**: Logic should be easily testable in isolation
4. **Error Handling**: Include proper error handling and loading states
5. **TypeScript**: Use proper TypeScript types for all logic

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall project architecture
- [PRESENTATION_LAYER.md](./PRESENTATION_LAYER.md) - Presentation layer details
- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) - State management patterns
