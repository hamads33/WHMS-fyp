const REGISTRAR_ERROR_TOASTS = {
  INVALID_DOMAIN: {
    title: 'Invalid domain',
    description: 'Check the spelling, TLD, and formatting before trying again.',
  },
  INSUFFICIENT_FUNDS: {
    title: 'Registrar funds required',
    description: 'The connected Porkbun account needs more balance before this action can continue.',
  },
  DOMAIN_NOT_FOUND: {
    title: 'Domain not found',
    description: 'The registrar could not find that domain in the connected account.',
  },
  ACCESS_DENIED: {
    title: 'Registrar access denied',
    description: 'The current Porkbun credentials do not allow this operation.',
  },
  FEATURE_UNSUPPORTED: {
    title: 'Feature unavailable',
    description: 'This registrar does not support that action in the current driver.',
  },
}

export function toastDomainError(toast, err, fallbackTitle = 'Request failed') {
  const mapped = REGISTRAR_ERROR_TOASTS[err?.code]

  toast({
    variant: 'destructive',
    title: mapped?.title || fallbackTitle,
    description: mapped?.description || err?.message || 'Something went wrong.',
  })
}
