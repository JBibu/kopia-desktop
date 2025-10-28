/**
 * Policies page (placeholder)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListTodo } from 'lucide-react';

export function Policies() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Policies</h1>
        <p className="text-muted-foreground">Configure backup policies and schedules</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Policy Management
          </CardTitle>
          <CardDescription>
            Configure retention, scheduling, compression, and exclusion rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">Policy management features coming in Phase 3</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
