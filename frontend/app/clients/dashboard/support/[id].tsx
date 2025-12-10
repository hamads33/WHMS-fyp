"use client"

import { use, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Send, Paperclip } from "lucide-react"

const ticketData = {
  id: "4521",
  subject: "Cannot access cPanel",
  department: "Technical Support",
  priority: "High",
  status: "Open",
  created: "Dec 7, 2025 10:30 AM",
}

const messages = [
  {
    id: 1,
    sender: "John Doe",
    role: "customer",
    message:
      "Hello, I'm unable to access my cPanel. When I try to login, it shows an error message saying 'Invalid credentials'. I've tried resetting my password but it's still not working. Can you please help?",
    time: "Dec 7, 2025 10:30 AM",
    avatar: "/customer-avatar.png",
  },
  {
    id: 2,
    sender: "Sarah Support",
    role: "support",
    message:
      "Hi John, thank you for contacting us. I apologize for the inconvenience you're experiencing. I've checked your account and it appears there was a temporary lock on your cPanel access due to multiple failed login attempts. I've now removed the lock. Could you please try logging in again and let me know if you're still experiencing issues?",
    time: "Dec 7, 2025 11:15 AM",
    avatar: "/support-agent-avatar.png",
  },
  {
    id: 3,
    sender: "John Doe",
    role: "customer",
    message:
      "Thank you for the quick response! I tried logging in again but I'm still getting the same error. Is there anything else that could be causing this?",
    time: "Dec 7, 2025 12:00 PM",
    avatar: "/customer-avatar.png",
  },
]

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [reply, setReply] = useState("")

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/support">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{ticketData.subject}</h1>
            <Badge variant="outline">#{ticketData.id}</Badge>
            <Badge variant="default" className="bg-success text-success-foreground">
              {ticketData.status}
            </Badge>
            <Badge variant="destructive">{ticketData.priority}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {ticketData.department} • Created {ticketData.created}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-4 ${message.role === "customer" ? "" : "flex-row-reverse"}`}>
              <Avatar className="w-10 h-10">
                <AvatarImage src={message.avatar || "/placeholder.svg"} />
                <AvatarFallback>{message.sender[0]}</AvatarFallback>
              </Avatar>
              <div className={`flex-1 max-w-[80%] ${message.role === "customer" ? "" : "text-right"}`}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-sm">{message.sender}</span>
                  {message.role === "support" && (
                    <Badge variant="secondary" className="text-xs">
                      Staff
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{message.time}</span>
                </div>
                <div
                  className={`p-4 rounded-lg ${
                    message.role === "customer" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.message}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reply to Ticket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Type your message here..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={5}
          />
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm">
              <Paperclip className="w-4 h-4 mr-2" />
              Attach File
            </Button>
            <Button>
              <Send className="w-4 h-4 mr-2" />
              Send Reply
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
