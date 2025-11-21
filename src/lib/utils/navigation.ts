/**
 * Navigation utilities for consistent routing behavior across the app
 */

import type { NavigateFunction } from 'react-router';

/**
 * Navigate back with fallback to a specific route
 * If browser history exists, go back. Otherwise navigate to fallback.
 */
export function navigateBack(navigate: NavigateFunction, fallback: string): void {
  // Check if we have history to go back to
  if (window.history.length > 2) {
    void navigate(-1);
  } else {
    void navigate(fallback);
  }
}

/**
 * Navigate to snapshot browse view
 * @param snapshotId - The snapshot ID
 * @param oid - The current object ID to browse
 * @param rootOid - The root object ID of the snapshot (for breadcrumb navigation)
 * @param path - The current path within the snapshot
 */
export function navigateToSnapshotBrowse(
  navigate: NavigateFunction,
  snapshotId: string,
  oid: string,
  rootOid: string,
  path: string
): void {
  const params = new URLSearchParams({
    snapshotId,
    oid,
    rootOid,
    path,
  });
  void navigate(`/snapshots/browse?${params.toString()}`);
}

/**
 * Navigate to snapshot restore view
 */
export function navigateToSnapshotRestore(
  navigate: NavigateFunction,
  snapshotId: string,
  oid: string,
  path: string
): void {
  const params = new URLSearchParams({
    snapshotId,
    oid,
    path,
  });
  void navigate(`/snapshots/restore?${params.toString()}`);
}
