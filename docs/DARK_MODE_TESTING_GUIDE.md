# Dark Mode Implementation - Testing Guide

## 🎯 Implementation Summary

Dark/light mode has been successfully implemented using Tailwind CSS v4 with the following infrastructure:

### Files Modified/Created:
1. ✅ `src/presentation/styles/global.css` - Added Tailwind v4 dark mode configuration
2. ✅ `src/core/context/ThemeContext.tsx` - Created theme management context
3. ✅ `src/core/context/index.ts` - Exported ThemeProvider and useTheme
4. ✅ `src/main.tsx` - Wrapped app with ThemeProvider
5. ✅ `src/presentation/pages/ThemeTest.tsx` - Created comprehensive test page
6. ✅ `src/core/router/routes.tsx` - Added /theme-test route

---

## 🧪 How to Test

### Step 1: Access the Test Page
1. Ensure the dev server is running: `npm run dev`
2. Navigate to: **http://localhost:5174/theme-test**

### Step 2: Verify Theme Toggle
- [ ] Click **"Toggle Theme"** button
- [ ] Verify the page switches between light and dark modes
- [ ] Check that the "Current Theme" card updates
- [ ] Confirm the "HTML Class" shows "dark" when in dark mode, "(empty)" in light mode

### Step 3: Test Individual Theme Settings
- [ ] Click **"Set Light"** - page should switch to light mode
- [ ] Click **"Set Dark"** - page should switch to dark mode  
- [ ] Click **"Set System"** - page should match your OS theme preference

### Step 4: Verify LocalStorage Persistence
- [ ] Set theme to "dark"
- [ ] Refresh the page (F5 or Ctrl+R)
- [ ] Verify dark mode persists after refresh
- [ ] Check "LocalStorage" card shows: `dark`
- [ ] Repeat for "light" and "system" themes

### Step 5: Test System Preference Detection
- [ ] Set theme to "system"
- [ ] Change your OS theme preference (Windows: Settings > Personalization > Colors)
- [ ] Verify the app theme updates automatically
- [ ] Check "System Preference" card shows correct value

### Step 6: Visual Component Testing
Scroll down to the "Visual Tests" section and verify:
- [ ] Card components have different backgrounds in light/dark mode
- [ ] Buttons (Success, Danger, Neutral) are visible in both modes
- [ ] Border test box has visible borders in both modes
- [ ] Input field is readable and styled correctly in both modes

### Step 7: Integration Testing
- [ ] Navigate to other pages (Home, Products, etc.)
- [ ] Verify theme persists across page navigation
- [ ] Toggle theme from different pages
- [ ] Confirm no console errors

---

## 🔧 How to Use in Your Components

### Import the hook:
```tsx
import { useTheme } from "@core/context";
```

### Use in your component:
```tsx
function MyComponent() {
  const { theme, effectiveTheme, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Effective theme: {effectiveTheme}</p>
      
      <button onClick={toggleTheme}>
        Toggle Theme
      </button>
      
      <button onClick={() => setTheme('dark')}>
        Dark Mode
      </button>
      
      <button onClick={() => setTheme('light')}>
        Light Mode
      </button>
      
      <button onClick={() => setTheme('system')}>
        System Preference
      </button>
    </div>
  );
}
```

---

## 🎨 How to Style Components for Dark Mode

Tailwind CSS automatically supports dark mode with the `dark:` prefix:

```tsx
// Background colors
<div className="bg-white dark:bg-gray-900">

// Text colors
<p className="text-gray-900 dark:text-white">

// Borders
<div className="border-gray-300 dark:border-gray-700">

// Hover states
<button className="hover:bg-gray-100 dark:hover:bg-gray-800">

// Complex example
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg p-4">
  Content here
</div>
```

---

## 📋 Technical Details

### Theme Context API:
- **`theme`**: Current theme setting ('light' | 'dark' | 'system')
- **`effectiveTheme`**: Actual theme being displayed ('light' | 'dark')
- **`setTheme(theme)`**: Set theme explicitly
- **`toggleTheme()`**: Toggle between light and dark

### How It Works:
1. **Tailwind Configuration**: `@theme { --color-scheme: light dark; }` enables dark mode
2. **Class Strategy**: Dark mode is activated by adding `dark` class to `<html>` element
3. **Theme Context**: Manages theme state and applies/removes the `dark` class
4. **LocalStorage**: Persists user preference with key `dlizza-theme`
5. **System Detection**: Uses `prefers-color-scheme` media query

### Storage Key:
```
localStorage.getItem('dlizza-theme') // Returns: 'light' | 'dark' | 'system'
```

---

## ✅ Expected Test Results

### All Tests Passing:
- ✓ Theme toggles correctly between light/dark
- ✓ Individual theme buttons work (Set Light, Set Dark, Set System)
- ✓ Theme persists after page refresh
- ✓ LocalStorage value matches current theme
- ✓ HTML element has/doesn't have 'dark' class appropriately
- ✓ System preference is detected and followed when theme is 'system'
- ✓ All visual components render correctly in both modes
- ✓ Theme persists across page navigation
- ✓ No console errors

---

## 🚀 Next Steps

After verifying all tests pass:

1. **Remove Test Page** (optional):
   - Delete `src/presentation/pages/ThemeTest.tsx`
   - Remove the route from `src/core/router/routes.tsx`

2. **Add Theme Toggle to UI**:
   - Add a theme toggle button to your Header/Settings page
   - Example: Sun/Moon icon that calls `toggleTheme()`

3. **Update Existing Components**:
   - Gradually add `dark:` variants to existing Tailwind classes
   - Focus on high-contrast areas first (backgrounds, text, borders)

4. **Test on Real Devices**:
   - Test on mobile devices
   - Verify system preference detection works on iOS/Android

---

## 🐛 Troubleshooting

### Theme not persisting:
- Check browser console for localStorage errors
- Verify localStorage is enabled in browser
- Check that `dlizza-theme` key exists in localStorage

### Dark mode not applying:
- Inspect `<html>` element - should have `class="dark"` in dark mode
- Verify Tailwind CSS is loaded correctly
- Check browser console for CSS errors

### System preference not working:
- Verify browser supports `prefers-color-scheme` media query
- Check OS theme settings are configured
- Test with `theme` set to "system"

---

## 📝 Notes

- **No UI redesign required**: Existing components work as-is
- **No refactoring needed**: Theme context is separate from business logic
- **Minimal changes**: Only 4 files modified + 1 test page created
- **Production ready**: LocalStorage persistence and system detection included
- **Type safe**: Full TypeScript support with proper types

---

**Implementation Date**: $(date)
**Tailwind Version**: 4.1.17
**Strategy**: Class-based dark mode
