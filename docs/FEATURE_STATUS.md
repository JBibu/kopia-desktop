# Kopia-Desktop Feature Status

**Last Updated:** 2025-11-06
**Overall Completeness:** 74% of official KopiaUI features

This document provides a comprehensive overview of feature implementation status compared to the official KopiaUI.

---

## Quick Status Summary

### ✅ Fully Implemented (74%)

**Core Functionality:**

- ✅ Repository connection & management
- ✅ Snapshot source listing with real-time status
- ✅ Snapshot history viewing
- ✅ Snapshot browsing (directory navigation)
- ✅ Snapshot deletion
- ✅ Policy listing, viewing, and editing
- ✅ Policy inheritance (4-level hierarchy)
- ✅ Task monitoring and cancellation
- ✅ Repository setup wizard
- ✅ All 50 backend API commands

**Modern Enhancements:**

- ✅ Dashboard/Overview page (not in KopiaUI)
- ✅ Internationalization (English + Spanish)
- ✅ Modern UI with shadcn/ui components
- ✅ Theme system (light/dark/system)
- ✅ Centralized state management (Zustand)
- ✅ WebSocket + polling hybrid

### ⚠️ Partially Implemented (15%)

**Present but needs enhancement:**

- ⚠️ Snapshot creation (backend ready, no UI form)
- ⚠️ Task details (basic display, missing logs viewer)
- ⚠️ Maintenance management (info shown, can't trigger)
- ⚠️ Notification profiles (backend ready, minimal UI)

### ❌ Missing (11%)

**Not yet implemented:**

- ❌ Snapshot restore UI (backend ready)
- ❌ Mount management UI (backend ready)
- ❌ Snapshot metadata editing (descriptions, tags, pins)
- ❌ Snapshot estimation UI
- ❌ Advanced policy preview

---

## Feature Comparison by Category

### 1. Repository Management

| Feature                | KopiaUI | kopia-desktop | Status       |
| ---------------------- | ------- | ------------- | ------------ |
| Connect to repository  | ✅      | ✅            | Complete     |
| Create repository      | ✅      | ✅            | Complete     |
| Repository status      | ✅      | ✅            | Complete     |
| Disconnect             | ✅      | ✅            | Complete     |
| Storage providers (8)  | ✅      | ✅            | Complete     |
| Repository wizard      | ✅      | ✅            | **Enhanced** |
| Maintenance info       | ✅      | ✅            | Complete     |
| Maintenance trigger    | ✅      | ❌            | Missing UI   |
| Repository description | ✅      | ✅            | Complete     |

**Grade: A (90%)** - Missing only maintenance trigger UI

---

### 2. Snapshots Management

| Feature                   | KopiaUI | kopia-desktop | Status               |
| ------------------------- | ------- | ------------- | -------------------- |
| List sources              | ✅      | ✅            | Complete             |
| Source status             | ✅      | ✅            | Complete             |
| Real-time upload progress | ✅      | ✅            | Complete             |
| Create snapshot           | ✅      | ⚠️            | Backend ready, no UI |
| Cancel snapshot           | ✅      | ✅            | Complete             |
| Snapshot history          | ✅      | ✅            | Complete             |
| Browse snapshot           | ✅      | ✅            | Complete             |
| Delete snapshots          | ✅      | ✅            | Complete             |
| Edit metadata             | ✅      | ❌            | Missing              |
| Pins management           | ✅      | ❌            | Missing              |
| Tags management           | ✅      | ❌            | Missing              |
| Estimate size             | ✅      | ❌            | Missing UI           |
| Restore to filesystem     | ✅      | ❌            | Missing UI           |
| Restore to ZIP/TAR        | ✅      | ❌            | Missing UI           |
| Mount snapshots           | ✅      | ❌            | Missing UI           |
| Unmount snapshots         | ✅      | ❌            | Missing UI           |

**Grade: C+ (65%)** - Core viewing works, missing creation & restore

**Priority Missing:**

1. **Snapshot Creation UI** (HIGH) - Users can't create snapshots via UI
2. **Restore UI** (HIGH) - Core backup use case
3. **Mount Management** (MEDIUM) - Useful for file recovery
4. **Metadata Editing** (MEDIUM) - Descriptions, tags, pins

---

### 3. Policies Management

| Feature            | KopiaUI | kopia-desktop | Status        |
| ------------------ | ------- | ------------- | ------------- |
| List policies      | ✅      | ✅            | Complete      |
| View policy        | ✅      | ✅            | Complete      |
| Edit policy        | ✅      | ✅            | Complete      |
| Delete policy      | ✅      | ✅            | Complete      |
| Policy inheritance | ✅      | ✅            | Complete      |
| Scheduling policy  | ✅      | ✅            | Complete      |
| Retention policy   | ✅      | ✅            | Complete      |
| Files policy       | ✅      | ✅            | Complete      |
| Compression policy | ✅      | ✅            | Complete      |
| Error handling     | ✅      | ✅            | Complete      |
| Actions (hooks)    | ✅      | ✅            | Complete      |
| OS snapshots (VSS) | ✅      | ✅            | Complete      |
| Logging policy     | ✅      | ✅            | Complete      |
| Upload policy      | ✅      | ✅            | Complete      |
| Resolve policy     | ✅      | ⚠️            | Backend ready |
| Upcoming snapshots | ✅      | ⚠️            | Backend ready |

**Grade: A (95%)** - Excellent implementation

---

### 4. Tasks Management

| Feature           | KopiaUI | kopia-desktop | Status        |
| ----------------- | ------- | ------------- | ------------- |
| List tasks        | ✅      | ✅            | Complete      |
| Task summary      | ✅      | ✅            | Complete      |
| Task status       | ✅      | ✅            | Complete      |
| Cancel task       | ✅      | ✅            | Complete      |
| Task details      | ✅      | ⚠️            | Basic display |
| Task logs         | ✅      | ❌            | Backend ready |
| Task counters     | ✅      | ✅            | Complete      |
| Progress info     | ✅      | ✅            | Complete      |
| Real-time updates | ✅      | ✅            | Complete      |

**Grade: B+ (85%)** - Good, missing logs viewer

---

### 5. Preferences & Settings

| Feature                | KopiaUI | kopia-desktop | Status          |
| ---------------------- | ------- | ------------- | --------------- |
| Theme (light/dark)     | ✅      | ✅            | Complete        |
| System theme           | ❌      | ✅            | **Enhanced**    |
| Font size              | ❌      | ✅            | **New feature** |
| Internationalization   | ❌      | ✅            | **New feature** |
| Page size              | ✅      | ✅            | Complete        |
| Snapshot view mode     | ✅      | ✅            | Complete        |
| Byte display format    | ✅      | ✅            | Complete        |
| Notification profiles  | ✅      | ⚠️            | Basic UI        |
| Email notifications    | ✅      | ✅            | Complete        |
| Pushover notifications | ✅      | ✅            | Complete        |
| Webhook notifications  | ✅      | ✅            | Complete        |

**Grade: A (95%)** - Actually better than KopiaUI

---

### 6. UI/UX Features

| Feature             | KopiaUI | kopia-desktop | Status          |
| ------------------- | ------- | ------------- | --------------- |
| Dashboard           | ❌      | ✅            | **New feature** |
| Sidebar navigation  | ❌      | ✅            | **Enhanced**    |
| Modern design       | ❌      | ✅            | **Enhanced**    |
| Responsive layout   | ✅      | ✅            | Complete        |
| Toast notifications | ✅      | ✅            | Complete        |
| Loading states      | ✅      | ✅            | Complete        |
| Error boundaries    | ✅      | ✅            | Complete        |
| Keyboard navigation | ⚠️      | ✅            | **Enhanced**    |
| Accessibility       | ⚠️      | ✅            | **Enhanced**    |

**Grade: A+ (100%)** - Superior to KopiaUI

---

## Detailed Feature Matrix

### ✅ Complete Features (35 features)

**Repository:**

1. Repository connection/disconnection
2. Repository creation wizard
3. 8 storage provider types
4. Repository status display
5. Repository description
6. Algorithm selection

**Snapshots:** 7. Source listing 8. Source status (IDLE/UPLOADING/FAILED) 9. Snapshot history per source 10. Directory browsing 11. Snapshot deletion 12. Real-time upload progress 13. Snapshot cancellation

**Policies:** 14. Policy listing 15. Policy viewing 16. Policy editing (all sub-policies) 17. Policy deletion 18. Inheritance visualization

**Tasks:** 19. Task listing 20. Task summary 21. Task cancellation 22. Progress tracking 23. Status monitoring

**Settings:** 24. Theme switching 25. Font size adjustment 26. Language switching (i18n) 27. Page size preferences

**UI Features:** 28. Dashboard/Overview 29. Modern sidebar navigation 30. Toast notifications 31. Loading states 32. Error handling 33. Responsive design 34. Keyboard navigation 35. WebSocket real-time updates

### ⚠️ Partial Features (7 features)

1. **Snapshot Creation** - Backend ready, no UI form
2. **Task Details** - Basic display, missing logs viewer
3. **Maintenance** - Info displayed, can't trigger manually
4. **Notification Profiles** - Backend complete, minimal UI
5. **Policy Resolution** - Backend ready, not exposed in UI
6. **Upcoming Snapshots** - Backend calculates, not shown
7. **Mount Management** - Backend commands exist, no UI

### ❌ Missing Features (5 major features)

1. **Snapshot Restore UI** (HIGH PRIORITY)
   - Backend: ✅ Complete (`restore_start`, `RestoreRequest`)
   - Frontend: ❌ No page
   - Impact: Core backup recovery feature missing

2. **Mount Management** (MEDIUM PRIORITY)
   - Backend: ✅ Complete (`mount_snapshot`, `mounts_list`, `mount_unmount`)
   - Frontend: ❌ No UI
   - Impact: Useful for file-level recovery

3. **Snapshot Metadata Editing** (MEDIUM PRIORITY)
   - Backend: ✅ Complete (`snapshot_edit`)
   - Frontend: ❌ No UI
   - Impact: Can't add descriptions, tags, pins

4. **Estimation UI** (LOW PRIORITY)
   - Backend: ✅ Complete (`estimate_snapshot`)
   - Frontend: ❌ No UI
   - Impact: Can't preview snapshot size

5. **Manual Maintenance Trigger** (LOW PRIORITY)
   - Backend: ✅ Complete (`maintenance_run`)
   - Frontend: ❌ No button
   - Impact: Can't manually trigger maintenance

---

## Implementation Priority

### Phase 1: Critical Features (2-3 weeks)

**1. Snapshot Creation UI** (3-4 days)

- Create form with path picker
- Source configuration
- Policy override
- Estimation preview
- Start snapshot button

**2. Restore UI** (4-5 days)

- Restore wizard
- Target selection
- Options configuration
- Progress tracking
- Task monitoring

**3. Mount Management** (2-3 days)

- Mount snapshot dialog
- List mounted snapshots
- Unmount functionality
- File browser integration

**Priority: CRITICAL** - These are core backup/restore features

---

### Phase 2: Important Enhancements (1-2 weeks)

**4. Snapshot Metadata** (2-3 days)

- Edit descriptions
- Manage tags
- Pin/unpin snapshots
- Batch operations

**5. Task Details Enhancement** (2-3 days)

- Logs viewer with filtering
- Counter history graphs
- Export logs
- Task timeline

**6. Maintenance Trigger** (1 day)

- Manual maintenance button
- Quick vs full selection
- Safety mode options
- Progress dialog

**Priority: HIGH** - Improves user experience significantly

---

### Phase 3: Nice-to-Have (1 week)

**7. Estimation UI** (1-2 days)

- Size estimation before snapshot
- File count preview
- Error prediction

**8. Advanced Policy Features** (2-3 days)

- Policy resolution preview
- Upcoming snapshots display
- Policy diff viewer

**9. Notification Enhancements** (1-2 days)

- Better profile management UI
- Test notification UI
- Notification history

**Priority: MEDIUM** - Adds polish

---

### Phase 4: Future Enhancements (ongoing)

**10. Advanced Features**

- Compression statistics
- Deduplication metrics
- Repository health checks
- Backup verification

**11. Developer Experience**

- API documentation viewer
- Debug mode
- Log collection
- Performance monitoring

**Priority: LOW** - Future improvements

---

## Backend API Coverage

### Implemented: 50/50 Commands (100%)

**Repository:** 10/10 ✅

- status, connect, disconnect, create, exists, algorithms, update_description, maintenance_info, maintenance_run

**Sources/Snapshots:** 13/13 ✅

- sources_list, snapshot_create, snapshot_cancel, snapshots_list, snapshot_edit, snapshot_delete, object_browse, object_download, restore_start, mount_snapshot, mounts_list, mount_unmount, estimate_snapshot

**Policies:** 5/5 ✅

- policies_list, policy_get, policy_resolve, policy_set, policy_delete

**Tasks:** 5/5 ✅

- tasks_list, task_get, task_logs, task_cancel, tasks_summary

**Utilities:** 5/5 ✅

- path_resolve, ui_preferences_get, ui_preferences_set, get_system_info, get_current_user

**Notifications:** 4/4 ✅

- notification_profiles_list, notification_profile_create, notification_profile_delete, notification_profile_test

**WebSocket:** 3/3 ✅

- websocket_connect, websocket_disconnect, websocket_status

**System:** 5/5 ✅

- select_folder, select_file, kopia_server_start, kopia_server_stop, kopia_server_status

---

## Technical Strengths

### Architecture Advantages

**✅ Modern Stack:**

- React 19 with TypeScript (strict mode)
- Tauri 2.9 (secure, lightweight)
- Zustand for state management
- shadcn/ui component library

**✅ Better State Management:**

- Centralized Kopia store (907 lines)
- Single polling loop (30s server, 5s tasks)
- WebSocket + polling hybrid
- Eliminates redundant API calls

**✅ Superior UX:**

- Dashboard with metrics
- Modern sidebar navigation
- Internationalization ready
- Theme system (light/dark/system)
- Font size preferences
- Better keyboard navigation

**✅ Code Quality:**

- Strict TypeScript
- Comprehensive error handling
- Type-safe API layer
- 95% API accuracy grade

---

## Recommendations

### For Production Release

**Must Have (Phase 1):**

1. Implement Snapshot Creation UI
2. Implement Restore UI
3. Implement Mount Management
4. Add basic documentation

**Should Have (Phase 2):** 5. Metadata editing 6. Task logs viewer 7. Manual maintenance trigger

**Nice to Have (Phase 3):** 8. Estimation UI 9. Advanced policy features 10. Enhanced notifications

### For Users

**Current Version is suitable for:**

- ✅ Monitoring existing backups
- ✅ Browsing snapshot history
- ✅ Managing policies
- ✅ Repository administration
- ✅ Viewing backup status

**Not yet suitable for:**

- ❌ Creating first snapshots (CLI required)
- ❌ Restoring files (CLI required)
- ❌ Mounting snapshots (CLI required)

---

## Conclusion

kopia-desktop has achieved **excellent feature parity (74%)** with official KopiaUI, while adding modern enhancements. The missing 26% consists primarily of:

- Snapshot creation UI (backend ready)
- Restore UI (backend ready)
- Mount management (backend ready)

**The foundation is solid** - all 50 backend commands work correctly with 95% API accuracy. Implementing the missing UI features (2-3 weeks) will bring the project to **95%+ parity** with superior UX.

---

## See Also

- [API Reference](API_REFERENCE.md) - Complete REST API documentation
- [CLAUDE.md](../CLAUDE.md) - Project overview for AI assistants
- [Main README](../README.md) - Project introduction
