import AutomationModule from "@/components/automation-module"


import { Toaster } from "sonner"

export default function Home() {
  return (
    <>
      <AutomationModule />
      <Toaster richColors position="top-right" />
    </>
  )
}
