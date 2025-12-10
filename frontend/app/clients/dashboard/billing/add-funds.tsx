"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft, CreditCard, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

const presetAmounts = ["25", "50", "100", "250", "500"]

export default function AddFundsPage() {
  const [amount, setAmount] = useState("100")
  const [paymentMethod, setPaymentMethod] = useState("card")

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/billing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Funds</h1>
          <p className="text-muted-foreground mt-1">Top up your account balance</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Credits</p>
              <p className="text-2xl font-bold text-foreground">$250.00</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Amount</CardTitle>
          <CardDescription>Choose a preset amount or enter a custom value</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-5 gap-2">
            {presetAmounts.map((preset) => (
              <Button
                key={preset}
                variant={amount === preset ? "default" : "outline"}
                onClick={() => setAmount(preset)}
                className="h-12"
              >
                ${preset}
              </Button>
            ))}
          </div>
          <div>
            <Label htmlFor="custom-amount">Custom Amount</Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="custom-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                min="10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Select how you want to pay</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
            <div
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors",
                paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border",
              )}
              onClick={() => setPaymentMethod("card")}
            >
              <RadioGroupItem value="card" id="card" />
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <Label htmlFor="card" className="cursor-pointer">
                  Credit / Debit Card
                </Label>
                <p className="text-xs text-muted-foreground">Visa, Mastercard, American Express</p>
              </div>
            </div>
            <div
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors",
                paymentMethod === "paypal" ? "border-primary bg-primary/5" : "border-border",
              )}
              onClick={() => setPaymentMethod("paypal")}
            >
              <RadioGroupItem value="paypal" id="paypal" />
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                <Wallet className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <Label htmlFor="paypal" className="cursor-pointer">
                  PayPal
                </Label>
                <p className="text-xs text-muted-foreground">Pay with your PayPal account</p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
        <span className="text-sm text-muted-foreground">Total Amount</span>
        <span className="text-xl font-bold text-foreground">${amount || "0"}.00</span>
      </div>

      <Button className="w-full" size="lg">
        Add ${amount || "0"}.00 to Account
      </Button>
    </div>
  )
}
