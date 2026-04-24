'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Monitor, Smartphone, X, Code, Eye, Copy, Check, Download } from 'lucide-react';
import { sampleReplace } from './utils/mergeVariables';

export default function PreviewModal({ open, onClose, html, subject }) {
  const iframeRef = useRef(null);
  const [view, setView] = useState('desktop');
  const [tab, setTab] = useState('preview');
  const [copied, setCopied] = useState(false);

  const renderedHtml = sampleReplace(html || '');

  useEffect(() => {
    if (!open || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(renderedHtml);
      doc.close();
    }
  }, [open, renderedHtml, view]);

  const previewWidth = view === 'mobile' ? 375 : 640;

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(html || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = html || '';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([html || ''], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email-preview.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <TooltipProvider delayDuration={200}>
          {/* Header */}
          <DialogHeader className="flex-none px-5 py-3 border-b flex flex-row items-center gap-3">
            <DialogTitle className="flex-1 text-sm font-semibold truncate">
              {subject ? `Preview: ${subject}` : 'Email Preview'}
            </DialogTitle>

            {/* Tab toggle */}
            <div className="flex bg-muted rounded-lg p-0.5">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  tab === 'preview' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setTab('preview')}
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  tab === 'html' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setTab('html')}
              >
                <Code className="h-3.5 w-3.5" /> HTML
              </button>
            </div>

            {/* Viewport toggle (preview only) */}
            {tab === 'preview' && (
              <div className="flex bg-muted rounded-lg p-0.5">
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    view === 'desktop' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setView('desktop')}
                >
                  <Monitor className="h-3.5 w-3.5" /> Desktop
                </button>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    view === 'mobile' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setView('mobile')}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Mobile
                </button>
              </div>
            )}

            {/* HTML actions */}
            {tab === 'html' && (
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleCopyHtml}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Copy HTML to clipboard</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleDownload}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Download HTML file</TooltipContent>
                </Tooltip>
              </div>
            )}

            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-hidden bg-[#e8eaed] dark:bg-zinc-900">
            {tab === 'preview' ? (
              <div className="h-full flex items-start justify-center overflow-y-auto py-6">
                {/* Device frame */}
                <div className="flex flex-col transition-all duration-300" style={{ width: previewWidth }}>
                  {/* Browser / phone chrome */}
                  {view === 'mobile' ? (
                    /* Phone frame */
                    <div className="mx-auto" style={{ width: 375 }}>
                      {/* Phone notch */}
                      <div className="bg-zinc-800 rounded-t-[2rem] pt-3 px-3">
                        <div className="flex items-center justify-center pb-2">
                          <div className="h-5 w-28 rounded-full bg-zinc-900" />
                        </div>
                        <div className="bg-white rounded-t-lg overflow-hidden">
                          <div className="bg-gray-100 px-3 py-1.5 flex items-center gap-2 text-[10px] text-gray-400 border-b border-gray-200">
                            <span>inbox</span>
                            <span className="mx-auto font-medium text-gray-600 truncate max-w-[200px]">{subject || 'Email'}</span>
                          </div>
                          <iframe
                            ref={iframeRef}
                            title="Mobile Email Preview"
                            className="w-full border-none block"
                            style={{ height: '65vh', minHeight: 400 }}
                            sandbox="allow-same-origin"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Desktop browser frame */
                    <>
                      <div className="bg-gray-200 dark:bg-zinc-700 rounded-t-xl px-4 py-2 flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div className="h-3 w-3 rounded-full bg-red-400/60" />
                          <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
                          <div className="h-3 w-3 rounded-full bg-green-400/60" />
                        </div>
                        <div className="flex-1 mx-4">
                          <div className="h-6 rounded-md bg-white dark:bg-zinc-800 text-[11px] text-muted-foreground flex items-center px-3 font-mono">
                            mail.example.com
                          </div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-zinc-800 rounded-b-xl shadow-xl overflow-hidden">
                        {/* Inbox bar */}
                        <div className="px-4 py-2 border-b border-gray-100 dark:border-zinc-700 flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                          <span className="font-medium text-gray-700 dark:text-zinc-300">Inbox</span>
                          <span className="text-gray-300 dark:text-zinc-600">/</span>
                          <span className="truncate max-w-[300px]">{subject || 'Email Preview'}</span>
                        </div>
                        <iframe
                          ref={iframeRef}
                          title="Desktop Email Preview"
                          className="w-full border-none block"
                          style={{ height: '65vh', minHeight: 400 }}
                          sandbox="allow-same-origin"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full overflow-auto p-6">
                <pre className="text-xs font-mono bg-zinc-900 text-zinc-100 rounded-xl p-5 overflow-auto whitespace-pre-wrap leading-relaxed">
                  {html || '<!-- No content -->'}
                </pre>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-none px-5 py-2 border-t bg-muted/30 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              Merge variables replaced with sample data.
            </span>
            <span className="text-[11px] text-muted-foreground/50">
              {view === 'mobile' ? '375px' : '640px'} &middot; {(html || '').length.toLocaleString()} chars
            </span>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
