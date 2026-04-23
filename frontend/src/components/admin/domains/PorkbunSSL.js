'use client'

import { useEffect, useState } from 'react'
import { Loader2, Lock } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { adminGetDomainSSL } from '@/lib/api/domain'
import { useToast } from '@/hooks/use-toast'
import { toastDomainError } from '@/lib/domain-error-toast'

function SecretBlock({ label, value }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-3 text-xs leading-5">{value || 'Unavailable'}</pre>
    </div>
  )
}

export default function PorkbunSSL({ domainId }) {
  const { toast } = useToast()
  const [ssl, setSsl] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSsl = async () => {
      try {
        setLoading(true)
        const res = await adminGetDomainSSL(domainId)
        setSsl(res?.data ?? null)
      } catch (err) {
        toastDomainError(toast, err, 'Failed to load SSL data')
      } finally {
        setLoading(false)
      }
    }

    loadSsl()
  }, [domainId, toast])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Lock className="h-4 w-4 text-muted-foreground" /> Porkbun SSL Material
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            <SecretBlock label="Certificate Chain" value={ssl?.certificateChain} />
            <SecretBlock label="Public Key" value={ssl?.publicKey} />
            <SecretBlock label="Private Key" value={ssl?.privateKey} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
