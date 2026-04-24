'use client'

import Link from 'next/link'
import { ArrowLeft, Globe } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function PorkbunPage() {
  return (
    <div className="space-y-6">
      <Link href="/admin/domains">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All Domains
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Porkbun tools moved
          </CardTitle>
          <CardDescription>
            Registrar-specific DNS, glue, forwarding, and SSL controls now live inside each domain&apos;s detail page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/admin/domains">
            <Button>Open Domain List</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
