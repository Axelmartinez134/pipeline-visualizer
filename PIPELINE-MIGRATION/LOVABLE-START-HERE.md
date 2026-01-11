# 🚀 LOVABLE INTEGRATION GUIDE - PIPELINE VISUALIZER

## ⚠️ CRITICAL: READ THIS FIRST

**DO NOT DELETE THE PIPELINE-MIGRATION FOLDER UNTIL THE USER EXPLICITLY TELLS YOU TO.**

After you complete the integration and the user has tested everything, **WAIT** for them to say "Delete PIPELINE-MIGRATION folder" before removing it.

---

## 📦 WHAT YOU'RE INTEGRATING

You are adding a **simplified 3D pipeline visualizer** to automatedbots.com at the `/audit` route.

**What the user will see:**
1. Visit automatedbots.com/audit
2. See site header and footer (existing components)
3. See 3D pipeline visualization (overview locked, camera doesn't move)
4. See two buttons: "Current State" and "See After Automation"
5. Click "See After Automation" 3 times (button fills progressively: 33% → 66% → 100%)
6. See pipes grow larger with each click
7. See bottom overlay showing bottleneck priorities
8. Click "Schedule Free Consultation" button to open Calendly popup

**User Flow:**
`automatedbots.com/audit` → Pipeline demo → 3-click sequence → Book consultation

---

## 🎯 YOUR JOB (5 MAIN TASKS)

### TASK 1: Copy Feature Folder
```
Copy: PIPELINE-MIGRATION/src/features/audit/
  To: src/features/audit/
```
**Result:** Complete audit feature in main project

### TASK 2: Copy Page Component
```
Copy: PIPELINE-MIGRATION/src/pages/AuditPage.tsx
  To: src/pages/AuditPage.tsx
```
**Result:** New page component available for routing

### TASK 3: Add Route to App.tsx
**File:** `src/App.tsx`

**Step 1 - Add Import (at top with other page imports):**
```typescript
import AuditPage from './pages/AuditPage';
```

**Step 2 - Add Route (inside `<Routes>` component):**
```typescript
<Route path="/audit" element={<AuditPage />} />
```

**Full context - your Routes should look like:**
```typescript
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/testimonials" element={<Testimonials />} />
  <Route path="/ai-audit" element={<AIAudit />} />
  <Route path="/audit" element={<AuditPage />} />  {/* NEW */}
  <Route path="/case-study/nick" element={<CaseStudy />} />
  <Route path="*" element={<NotFound />} />
</Routes>
```

### TASK 4: Add Calendly Script to index.html
**File:** `index.html`

**Add these two lines inside `<head>` section:**
```html
<!-- Calendly embed script -->
<link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet">
<script src="https://assets.calendly.com/assets/external/widget.js" type="text/javascript" async></script>
```

### TASK 5: Update package.json Dependencies
**File:** `package.json`

**Update/Add these dependencies:**
```json
{
  "dependencies": {
    "three": "^0.178.0",
    "troika-three-text": "^0.52.4",
    "three-spritetext": "^1.10.0"
  }
}
```

**What to change:**
- Update "three" from ^0.162.0 to ^0.178.0
- Add "troika-three-text": "^0.52.4"
- Add "three-spritetext": "^1.10.0"

---

## ✅ AFTER COMPLETING INTEGRATION

### Run These Commands:
```bash
npm install
npm run dev
```

### Test Checklist:
1. Navigate to http://localhost:5173/audit
2. Verify page loads without errors
3. Verify 3D pipeline appears
4. Click "See After Automation" (1st time) → Pill fills 33%, pipe grows
5. Click "Apply Next Automation" (2nd time) → Pill fills 66%, pipe grows more
6. Click "Apply Next Automation" (3rd time) → Pill fills 100%, "Optimization complete"
7. Click "Current State" → Everything resets
8. Click "Schedule Free Consultation" → Calendly popup opens
9. Test on mobile (< 768px width) → Buttons work, overlay positioned correctly
10. Check console → No errors

### Push to GitHub:
When tests pass, push to `main` branch:
```
git add .
git commit -m "Add pipeline visualizer at /audit route"
git push origin main
```

Vercel will auto-deploy.

### Test Production:
Visit https://automatedbots.com/audit and repeat tests.

---

## 🚨 IMPORTANT RULES

### DO:
✅ Copy all files from PIPELINE-MIGRATION to their target locations  
✅ Add the route to App.tsx exactly as shown  
✅ Add Calendly script to index.html <head>  
✅ Update package.json dependencies  
✅ Run `npm install` after updating package.json  
✅ Test thoroughly before pushing  
✅ Wait for user confirmation before deleting PIPELINE-MIGRATION

### DON'T:
❌ Don't modify any existing files except App.tsx, index.html, and package.json  
❌ Don't change the pipeline behavior (it's configured correctly)  
❌ Don't rename or reorganize the audit feature files  
❌ Don't delete PIPELINE-MIGRATION folder until user says so  
❌ Don't add/remove/modify CSS styles (they're already correct)  
❌ Don't change the 3D system files (critical modifications already made)

---

## 🛠️ TROUBLESHOOTING

### If TypeScript errors appear:
- Check that all imports use correct paths
- Verify `@/` alias works for main site imports
- Verify relative imports work for audit feature files

### If Three.js errors appear:
- Confirm `npm install` ran successfully
- Verify Three.js version is ^0.178.0
- Check browser console for WebGL errors

### If Calendly doesn't open:
- Verify Calendly script is in index.html <head>
- Check browser console for Calendly errors
- Wait a few seconds after page load (script loads async)

### If mobile overlays are positioned wrong:
- educational-overlays.css includes mobile fixes
- Check browser DevTools console for CSS conflicts
- Test at < 768px width

### If build fails:
- Check package.json syntax is correct
- Run `npm install` again
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

---

## 📄 DETAILED DOCUMENTATION

For complete step-by-step instructions, see:
- **INTEGRATION-STEPS.md** - Full integration guide
- **FILE-MANIFEST.md** - Complete file list and modifications
- **README.md** - Package overview

---

## 🎯 SUCCESS CRITERIA

After integration, these should ALL be true:

✅ Navigate to /audit route  
✅ Page shows: Header + Pipeline + Buttons + Calendly + Footer  
✅ 3-click sequence works (pill fills: 0% → 33% → 66% → 100%)  
✅ Pipes grow/shrink correctly  
✅ Bottom overlay shows bottleneck priorities  
✅ Calendly button opens popup  
✅ Camera stays locked at overview (doesn't zoom in)  
✅ No thought bubbles appear (process-specific suggestions hidden)  
✅ Works on mobile (< 768px width)  
✅ No console errors  
✅ All existing routes still work (/,  /testimonials, /ai-audit, /case-study/nick)  
✅ Build succeeds (`npm run build`)  
✅ Vercel deployment works  

---

## 🚀 READY TO START?

1. Read this guide completely
2. Review INTEGRATION-STEPS.md for detailed steps
3. Start with Task 1 (copy feature folder)
4. Work through Tasks 2-5 sequentially
5. Run tests
6. Push to GitHub
7. Test production
8. **Wait for user confirmation**
9. Then (and only then) delete PIPELINE-MIGRATION folder

---

## 💬 FINAL NOTES

- This package contains 36 files organized in the exact target structure
- 5 files have been modified for the simplified audit page (clearly marked with comments)
- All modifications are intentional and critical for correct behavior
- The pipeline is fully functional and tested
- Mobile responsive CSS is included
- Calendly integration is ready (just uses placeholder URL for now)

**You've got this! Follow the steps and everything will work perfectly.** 🎯

---

**Package Version:** 1.0  
**Created:** January 2026  
**Target:** automatedbots.com/audit  
**Files:** 36 total (3 page/components, 25 3D system, 3 CSS, 5 docs/config)
