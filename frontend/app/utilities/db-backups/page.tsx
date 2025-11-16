"use client";

import { AppSidebar } from "@/components/app-sidebar";
import CpanelBackupForm from "@/components/backup-forms/cpanelbackupform";
import EmailBackupForm from "@/components/backup-forms/emailbackupforms";
import FtpForm from "@/components/custom-components/ftp-form";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Mail, CloudUpload, RotateCcw } from "lucide-react";
import { useState } from "react";


export default function SystemSettingsPage() {
  const [activeForm, setActiveForm] = useState<"cpanel" | "email" | null>(null);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 52)",
          "--header-height": "calc(var(--spacing) * 10)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />

      <SidebarInset className="flex flex-col min-h-screen bg-muted/10">
        {/* TOP HEADER */}
        <SiteHeader />

        <div className="flex flex-1 flex-col px-6 py-8 gap-8">

          {/* PAGE HEADING */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">FTP & Backup Tools</h1>
            <p className="text-muted-foreground text-sm">
              Configure FTP and generate system backups as needed.
            </p>
          </div>

          {/* BACKUP BUTTONS */}
          <div className="flex flex-wrap gap-4 items-center">

            {/* cPanel Backup Card Button */}
            <div
              onClick={() => setActiveForm("cpanel")}
              className={`flex cursor-pointer flex-row items-center p-4 border rounded-md bg-muted transition-all w-64 
                ${activeForm === "cpanel" ? "border-primary shadow-sm" : "border-muted-foreground/20"}`}
            >
              <Server className="h-5 w-5 text-primary" />
              <div className="ml-3">
                <p className="font-semibold">cPanel Backup</p>
                <p className="text-xs text-muted-foreground">Generate full hosting backup</p>
              </div>
            </div>

            {/* Email Backup Card Button */}
            <div
              onClick={() => setActiveForm("email")}
              className={`flex cursor-pointer flex-row items-center p-4 border rounded-md bg-muted transition-all w-64 
                ${activeForm === "email" ? "border-primary shadow-sm" : "border-muted-foreground/20"}`}
            >
              <Mail className="h-5 w-5 text-primary" />
              <div className="ml-3">
                <p className="font-semibold">Email Backup</p>
                <p className="text-xs text-muted-foreground">Download mailbox archives</p>
              </div>
            </div>

            {/* Show Back Button only when a backup form is active */}
            {activeForm !== null && (
              <button
                onClick={() => setActiveForm(null)}
                className="flex items-center gap-2 text-sm px-4 py-3 border rounded-md hover:bg-muted transition w-64"
              >
                <RotateCcw className="h-4 w-4 text-primary" />
                Back to FTP Settings
              </button>
            )}

          </div>

          {/* BACKUP FORMS */}
          {activeForm === "cpanel" && (
            <Card className="border border-primary/20 shadow-sm max-w-4xl animate-in fade-in duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CloudUpload className="h-5 w-5 text-primary" />
                  cPanel Backup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CpanelBackupForm /> 
                {/* <p className="text-muted-foreground">cPanel Backup Form goes here</p> */}
              </CardContent>
            </Card>
          )}

          {activeForm === "email" && (
            <Card className="border border-primary/20 shadow-sm max-w-4xl animate-in fade-in duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-primary" />
                  Email Backup
                </CardTitle>
              </CardHeader>
              <CardContent>
                 <EmailBackupForm /> 
                <p className="text-muted-foreground">Email Backup Form goes here</p>
              </CardContent>
            </Card>
          )}

          {/* FTP SETTINGS - show only if no backup form selected */}
          {activeForm === null && (
            <Card className="border border-primary/20 shadow-sm max-w-4xl animate-in fade-in duration-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">FTP Connection Settings</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 pb-6">
                <FtpForm />
              </CardContent>
            </Card>
          )}

        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
