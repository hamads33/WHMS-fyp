"use client"

import * as React from "react"
import { ButtonGroup } from "@/components/ui/button-group"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

const AutomationOptions = [
  {
    value: "Auto Suspensions",
   
  },
  {
    value: "Auto Termination",
    
  },
  {
    value: "Domain Renewal notices",
    
  },
  {
    value: "Close Inactive Tickets",
    
  },
  {
    value: "Invoice Reminders",
    
  },
  {
    value: "Cancellation Requests",
    
  },
]

export function ButtonGroupSelect() {
  const [automationOption, setAutomationOption] = React.useState("Auto Suspension")

  return (
    <ButtonGroup>
      <ButtonGroup>
        <Select value={automationOption} onValueChange={setAutomationOption}>
          <SelectTrigger className="font-mono h-12 w-50">
            {automationOption}
          </SelectTrigger>
          <SelectContent className="min-w-50">
            {AutomationOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.value}{" "}
                
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ButtonGroup>
    </ButtonGroup>
  )
}
