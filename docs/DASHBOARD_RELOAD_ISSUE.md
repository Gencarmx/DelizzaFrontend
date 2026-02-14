# Dashboard Infinite Spinner on Reload - Issue Documentation

## Problem Summary
When reloading the restaurant dashboard page (F5), the loading spinner persists indefinitely and the dashboard never loads. This occurs specifically on page reload, not on initial navigation.

## Root Cause
`supabase.auth.getSession()` hangs indefinitely during page reload, never returning a response. This causes the authentication state to never become "ready", preventing the ProtectedRoute from rendering the Dashboard component.

### Technical Details
- `supabase.auth.getSession()` is called in `AuthContext.initializeAuth()` to restore the session on app startup
- On initial login/navigation: Works correctly
- On page reload (F5): The promise never resolves, blocking the auth initialization
- The `onAuthStateChange` event fires correctly with the user data, but `getSession()` remains stuck
- This appears to be a bug in Supabase Auth with session persistence in localStorage

## Symptoms
1. Spinner shows indefinitely on page reload
2. Console shows: `ProtectedRoute - isAuthReady: false user: undefined` repeatedly
3. No errors in console
4. Network tab shows no pending requests
5. `initializeAuth` starts but never completes the `getSession` call

## Temporary Solution (Implemented)
Added a 5-second timeout to `getSession()` using `Promise.race()`. If `getSession()` hangs, the timeout triggers and sets `isAuthReady = true`, allowing the app to proceed. The `onAuthStateChange` event then provides the user data shortly after.

### Code Changes

#### 1. AuthContext.tsx - Added timeout to getSession
```typescript
const initializeAuth = async () => {
  try {
    // Add timeout to prevent hanging on getSession
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('getSession timeout')), 5000)
    );
    
    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
    // ... rest of initialization
  } catch (error) {
    console.error('getSession failed or timed out:', error);
    // Mark auth as ready even on failure to prevent infinite loading
  }
  setIsAuthReady(true);
};
```

#### 2. ProtectedRoute.tsx - Use isAuthReady instead of loading
```typescript
const { user, role, businessActive, loading, isAuthReady } = useAuth();

// Wait for auth to be ready before making any decisions
if (!isAuthReady) {
  return <LoadingSpinner />;
}
```

#### 3. RestaurantLayout.tsx - Simplified state management
- Removed complex businessId fetching logic
- Added proper loading states
- Simplified useEffect dependencies

## Files Modified
- `src/core/context/AuthContext.tsx` - Added timeout to getSession
- `src/core/router/ProtectedRoute.tsx` - Use isAuthReady for routing decisions
- `src/presentation/layouts/RestaurantLayout.tsx` - Simplified layout logic

## Testing Results
✅ After fix:
- Page reload shows spinner for ~5 seconds maximum
- Dashboard loads correctly after timeout
- Real-time notifications configure properly
- No infinite spinner

## Future Investigation
This is a workaround. The root cause should be investigated further:

1. **Supabase Version**: Check if upgrading supabase-js resolves the issue
2. **Storage Configuration**: Review localStorage vs memory storage configuration
3. **Session Persistence**: Investigate if `persistSession: true` is causing issues
4. **Browser Specific**: Test in different browsers to isolate the issue
5. **Supabase Issues**: Check https://github.com/supabase/supabase-js for similar reported issues

## Related Code References
- AuthContext: `initializeAuth()` function
- ProtectedRoute: Route guard component
- RestaurantLayout: Layout component with businessId fetching
- Supabase client configuration in `src/core/supabase/client.ts`

## Workaround Stability
The 5-second timeout workaround is stable for production use. It:
- Prevents infinite loading states
- Allows the app to recover from the hanging getSession
- Doesn't affect normal operation when getSession works correctly
- Provides fallback via onAuthStateChange event

## Notes
- The timeout duration (5s) was chosen empirically - long enough for normal operation, short enough to not annoy users
- If getSession starts working correctly in future Supabase updates, the timeout will not interfere
- Monitor Supabase releases for fixes to auth session restoration
