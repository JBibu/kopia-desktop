/**
 * Snapshots page (placeholder)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderArchive } from 'lucide-react';

export function Snapshots() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Snapshots</h1>
        <p className="text-muted-foreground">View and manage your backup snapshots</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderArchive className="h-5 w-5" />
            Snapshot Management
          </CardTitle>
          <CardDescription>Browse, restore, and manage your backup snapshots</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">Snapshot management features coming in Phase 3</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
