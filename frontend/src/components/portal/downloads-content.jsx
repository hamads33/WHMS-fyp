'use client'

import { Download, FileText, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const downloads = [
  { id: 1, name: 'cPanel Control Panel Guide', description: 'Complete guide for managing your hosting via cPanel.', category: 'Documentation', size: '2.4 MB', format: 'PDF', icon: FileText },
  { id: 2, name: 'Softaculous Auto-Installer', description: 'One-click application installer for WordPress, Joomla and more.', category: 'Software', size: '14.8 MB', format: 'ZIP', icon: Package },
  { id: 3, name: 'SSL Certificate Setup Guide', description: 'Step-by-step instructions for setting up SSL on your domain.', category: 'Documentation', size: '1.2 MB', format: 'PDF', icon: FileText },
  { id: 4, name: 'Email Client Configuration', description: 'Settings for configuring Outlook, Thunderbird, and Apple Mail.', category: 'Documentation', size: '0.8 MB', format: 'PDF', icon: FileText },
  { id: 5, name: 'Backup Manager Plugin', description: 'Automated backup solution for your hosting account.', category: 'Software', size: '8.3 MB', format: 'ZIP', icon: Package },
]

export function DownloadsContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Downloads</h1>
        <p className="text-sm text-muted-foreground mt-1">Software, tools and documentation for your hosting services.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Available Downloads</CardTitle>
          <CardDescription className="text-xs">{downloads.length} files available</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {downloads.map((file) => {
              const Icon = file.icon
              return (
                <div key={file.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{file.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-xs h-5 px-1.5">{file.category}</Badge>
                      <span className="text-xs text-muted-foreground">{file.format} &bull; {file.size}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs shrink-0">
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
