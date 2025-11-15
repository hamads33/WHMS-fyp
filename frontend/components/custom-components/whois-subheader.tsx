import { Button } from "@/components/ui/button";

export function SubSiteHeader() {
  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center border-b transition-[width,height] ease-linear">
      <div className="w-full flex justify-center px-4 lg:px-6">
        {/* Centered Module Links */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            asChild
            size="sm"
            className="transition-colors hover:text-yellow-500 focus-visible:text-yellow-500"
          >
            <a
              href="/client-management"
              className="dark:text-foreground"
            >
              Client Management
            </a>
          </Button>
          <Button
            variant="ghost"
            asChild
            size="sm"
            className="transition-colors hover:text-yellow-500 focus-visible:text-yellow-500"
          >
            <a
              href="/order-processing"
              className="dark:text-foreground"
            >
              Order Processing
            </a>
          </Button>
          <Button
            variant="ghost"
            asChild
            size="sm"
            className="transition-colors hover:text-yellow-500 focus-visible:text-yellow-500"
          >
            <a
              href="/billing"
              className="dark:text-foreground"
            >
              Billing
            </a>
          </Button>
          <Button
            variant="ghost"
            asChild
            size="sm"
            className="transition-colors hover:text-yellow-500 focus-visible:text-yellow-500"
          >
            <a
              href="/service-provisioning"
              className="dark:text-foreground"
            >
              Service Provisioning
            </a>
          </Button>
          <Button
            variant="ghost"
            asChild
            size="sm"
            className="transition-colors hover:text-yellow-500 focus-visible:text-yellow-500"
          >
            <a
              href="/support-tickets"
              className="dark:text-foreground"
            >
              Support Tickets
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
