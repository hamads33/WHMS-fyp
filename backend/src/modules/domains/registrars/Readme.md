Each registrar module must export the following async functions:

- checkAvailability(domain)
- registerDomain(payload)
- renewDomain(payload)
- transferDomain(payload)
- updateNameservers(payload)

The domain core will dynamically import the registrar module
based on the configured registrar name.
