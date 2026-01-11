# 🎯 PIPELINE VISUALIZER MIGRATION PACKAGE

## ⚠️ CRITICAL INSTRUCTIONS FOR LOVABLE

**DO NOT DELETE THIS FOLDER UNTIL EXPLICITLY TOLD TO DO SO BY THE USER.**

After integration is complete and tested, **WAIT FOR USER CONFIRMATION** before removing this folder.

---

## 📦 WHAT'S IN THIS PACKAGE

This folder contains the complete pipeline visualizer code organized in the exact target structure for integration into the automatedbots.com website at the `/audit` route.

**File Count:**
- 30+ pipeline component files
- 1 page component (AuditPage.tsx)
- 1 route addition (for App.tsx)
- 3 CSS files
- Dependencies to add

---

## 🎯 INTEGRATION GOAL

Create a new `/audit` route on automatedbots.com that shows:
1. Site Header (from main site)
2. Pipeline Visualizer (3D demo with 2 buttons)
3. Calendly booking button
4. Site Footer (from main site)

**User Flow:**
- User visits automatedbots.com/audit
- Sees 3D pipeline at overview (camera locked)
- Clicks "See After Automation" (3-click sequence)
- Sees pipeline pipes grow with each click
- Clicks "Schedule Free Consultation" to book call

---

## 📁 FOLDER STRUCTURE

```
PIPELINE-MIGRATION/
├── README.md                           ← This file
├── INTEGRATION-STEPS.md                ← Step-by-step instructions for Lovable
├── package-additions.json              ← Dependencies to add
│
├── src/
│   ├── features/
│   │   └── audit/                      ← Complete audit feature (copy this)
│   │       ├── components/             ← React components
│   │       ├── 3d/                     ← Three.js 3D system
│   │       ├── contexts/               ← React context
│   │       └── styles/                 ← CSS files
│   │
│   └── pages/
│       └── AuditPage.tsx               ← New page component (copy this)
│
└── code-snippets/
    ├── App.tsx-route-addition.txt      ← Code to add to App.tsx
    └── index.html-calendly.txt         ← Calendly script to add to index.html
```

---

## ✅ WHAT LOVABLE NEEDS TO DO

### **Step 1: Copy Feature Folder**
```
Copy: PIPELINE-MIGRATION/src/features/audit/
  To: src/features/audit/
```

### **Step 2: Copy Page Component**
```
Copy: PIPELINE-MIGRATION/src/pages/AuditPage.tsx
  To: src/pages/AuditPage.tsx
```

### **Step 3: Add Route**
- Open `src/App.tsx`
- Follow instructions in `code-snippets/App.tsx-route-addition.txt`

### **Step 4: Add Calendly Script**
- Open `index.html`
- Follow instructions in `code-snippets/index.html-calendly.txt`

### **Step 5: Update Dependencies**
- Update `package.json` with contents from `package-additions.json`

### **Step 6: Test**
- Run `npm install`
- Run `npm run dev`
- Visit http://localhost:5173/audit
- Test the 3-click sequence

---

## 🚨 IMPORTANT NOTES

1. **DO NOT modify existing files** except:
   - `src/App.tsx` (add route)
   - `index.html` (add Calendly script)
   - `package.json` (add dependencies)

2. **DO NOT change pipeline behavior:**
   - Camera stays locked at overview
   - No thought bubbles appear
   - No water flow animations
   - Bottom overlay shows bottleneck list

3. **DO NOT delete this folder** until user confirms successful integration

4. **Import paths:**
   - External (main site): Use `@/components/Header`
   - Internal (audit feature): Use relative paths like `../3d/components/Camera`

---

## 📝 DETAILED INSTRUCTIONS

See `INTEGRATION-STEPS.md` for complete step-by-step integration guide.

---

## 🎯 SUCCESS CRITERIA

After integration, these should work:

✅ Navigate to /audit route
✅ See site header and footer
✅ See 3D pipeline visualization
✅ See two buttons: "Current State" and "See After Automation"
✅ Click "See After Automation" 3 times (pill fills 33% → 66% → 100%)
✅ See pipes grow with each click
✅ See bottom overlay showing bottleneck priorities
✅ See "Schedule Free Consultation" button
✅ Click Calendly button opens popup
✅ Works on mobile devices
✅ No console errors

---

## 🔄 AFTER SUCCESSFUL INTEGRATION

**WAIT FOR USER CONFIRMATION** before deleting this folder.

User will test and verify, then give explicit instruction to remove PIPELINE-MIGRATION.

---

**Ready to integrate? Read INTEGRATION-STEPS.md next!**
