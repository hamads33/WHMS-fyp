import PluginDetailClient from "./plugin-detail-client"

export async function generateMetadata({ params }) {
  const { id } = await params
  return {
    title: `Plugin ${id} Details | Marketplace`,
    description: "View detailed information about a plugin",
  }
}

export default function PluginDetailPage({ params }) {
  return <PluginDetailClient pluginId={params.id} />
}