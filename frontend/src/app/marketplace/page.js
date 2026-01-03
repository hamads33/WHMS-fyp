import MarketplaceClient from "./marketplace-client"

export const metadata = {
  title: "Plugin Marketplace | Discover Plugins",
  description: "Browse and install plugins for your application",
}

export default function MarketplacePage() {
  return <MarketplaceClient />
}