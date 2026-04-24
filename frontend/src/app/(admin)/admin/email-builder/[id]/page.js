'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import EmailBuilder from '@/components/email-builder/EmailBuilder';
import { EmailTemplatesAPI } from '@/lib/api/email-templates';
import { Loader2 } from 'lucide-react';

export default function EditEmailTemplatePage() {
  const { id } = useParams();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!id) return;
    EmailTemplatesAPI.get(id)
      .then((res) => setTemplate(res.template))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        Failed to load template: {error}
      </div>
    );
  }

  return <EmailBuilder templateId={id} initialTemplate={template} />;
}
