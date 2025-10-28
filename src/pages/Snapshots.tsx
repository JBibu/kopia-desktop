/**
 * Snapshots page (placeholder)
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderArchive, FileArchive, History, Search, Download } from 'lucide-react';

export function Snapshots() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Snapshots</h1>
          <Badge variant="outline" className="text-xs">
            Coming Soon
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">View and manage your backup snapshots</p>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-primary/10 p-4">
              <FolderArchive className="h-10 w-10 text-primary" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Feature In Development</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Snapshot management will be available in Phase 3
              </p>
            </div>

            <div className="w-full max-w-lg pt-4 text-left">
              <p className="text-xs font-medium text-muted-foreground mb-3">Planned features:</p>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileArchive className="h-4 w-4 text-muted-foreground" />
                  <span>Browse and filter snapshots</span>
                </div>
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span>View snapshot history</span>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span>Search for specific files</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span>Restore files and folders</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
