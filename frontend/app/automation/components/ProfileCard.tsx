// app/automation/components/ProfileCard.tsx
'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ProfileCard({ profile, onAddTask, onEdit }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div>
            <div className="font-medium">{profile.name}</div>
            <div className="text-xs text-muted-foreground">{profile.cron} — {profile.timezone}</div>
          </div>
          <Badge>{profile.isActive ? 'Active' : 'Disabled'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <Button variant="ghost" onClick={() => onAddTask(profile)}>Add Task</Button>
          <Button variant="outline" onClick={() => onEdit(profile)}>Edit</Button>
        </div>
        <div className="space-y-2">
          {profile.tasks?.map((t: any) => (
            <div key={t.id} className="p-2 border rounded-md flex justify-between items-center">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.actionId} • order {t.order}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm">Edit</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
