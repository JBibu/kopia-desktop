/**
 * Policies page (placeholder)
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListTodo, Calendar, Timer, Archive, FileX } from 'lucide-react';

export function Policies() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Policies</h1>
          <Badge variant="outline" className="text-xs">
            Coming Soon
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Configure backup policies and schedules</p>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-primary/10 p-4">
              <ListTodo className="h-10 w-10 text-primary" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Feature In Development</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Policy management will be available in Phase 3
              </p>
            </div>

            <div className="w-full max-w-lg pt-4 text-left">
              <p className="text-xs font-medium text-muted-foreground mb-3">Planned features:</p>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Retention policies</span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span>Backup scheduling</span>
                </div>
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <span>Compression settings</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileX className="h-4 w-4 text-muted-foreground" />
                  <span>Exclusion rules</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground max-w-lg pt-2">
              Note: Kopia uses a 4-level policy hierarchy (Global → Host → User → Path)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
