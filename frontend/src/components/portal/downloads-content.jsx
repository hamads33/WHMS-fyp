'use client'

import { useState, useEffect } from 'react'
import { Download, FileText, File } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ClientBroadcastAPI } from '@/lib/api/broadcast'

function getFileIcon(mimeType) {
  if (!mimeType) return FileText
  if (mimeType.includes('pdf')) return FileText
  return File
}

function formatFileSize(bytes) {
  if (!bytes) return 'Unknown'
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 10) / 10 + ' ' + sizes[i]
}

function getFileFormat(filename) {
  if (!filename) return 'File'
  const ext = filename.split('.').pop()?.toUpperCase() || 'File'
  return ext
}

export function DownloadsContent() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDocuments() {
      try {
        const res = await ClientBroadcastAPI.getDocuments()
        setDocuments(res.data || [])
      } catch (err) {
        console.error('Error loading documents:', err)
        setDocuments([])
      } finally {
        setLoading(false)
      }
    }
    loadDocuments()
  }, [])

  const handleDownload = (documentId) => {
    const downloadUrl = ClientBroadcastAPI.getDownloadUrl(documentId)
    window.open(downloadUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Downloads</h1>
        <p className="text-sm text-muted-foreground mt-1">Available documents and files for your account.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Available Downloads</CardTitle>
          <CardDescription className="text-xs">
            {loading ? 'Loading...' : `${documents.length} file${documents.length !== 1 ? 's' : ''} available`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FileText className="h-12 w-12 opacity-25 mb-2" />
              <p className="text-sm">No documents available yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {documents.map((file) => {
                const Icon = getFileIcon(file.fileMimeType)
                const format = getFileFormat(file.fileOriginalName)
                const fileSize = formatFileSize(file.fileSize)
                return (
                  <div key={file.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{file.title}</p>
                      {file.content && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{file.content}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground">{format} &bull; {fileSize}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file.id)}
                      className="gap-1.5 h-8 text-xs shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
