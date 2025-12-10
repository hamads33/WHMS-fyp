"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ProfilesList } from "./profiles-list"
import { ProfileForm } from "./profile-form"
import { TasksList } from "./tasks-list"
import { TaskForm } from "./task-form"
import type { AutomationProfile, AutomationTask } from "@/lib/automation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

type View =
  | { type: "list" }
  | { type: "create-profile" }
  | { type: "edit-profile"; profile: AutomationProfile }
  | { type: "view-tasks"; profile: AutomationProfile }
  | { type: "create-task"; profile: AutomationProfile }
  | { type: "edit-task"; profile: AutomationProfile; task: AutomationTask }
console.log("AutomationModule Loaded!")

export default function AutomationModule() {
  const [view, setView] = useState<View>({ type: "list" })

  // drawer state is derived from view (open if view is not list)
  const isPanelOpen = view.type !== "list"

  // helper to close panel and go back to list
  const closePanel = () => setView({ type: "list" })

  // accessibility: lock body scroll when panel open
  useEffect(() => {
    if (isPanelOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isPanelOpen])

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Profiles list (sticky) */}
          <aside className="md:col-span-1">
            <div className="sticky top-6">
              <ProfilesList
                onCreateNew={() => setView({ type: "create-profile" })}
                onEdit={(profile) => setView({ type: "edit-profile", profile })}
                onViewTasks={(profile) => setView({ type: "view-tasks", profile })}
              />
            </div>
          </aside>

          {/* Center column - Tasks or placeholder */}
          <main className="md:col-span-2">
            <AnimatePresence mode="wait">
              {view.type === "view-tasks" ? (
                <motion.div
                  key={view.profile.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <TasksList
                    profile={view.profile}
                    onBack={() => setView({ type: "list" })}
                    onAddTask={() => setView({ type: "create-task", profile: view.profile })}
                    onEditTask={(task) => setView({ type: "edit-task", profile: view.profile, task })}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={"placeholder"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="rounded-lg border bg-card p-6">
                    <h3 className="text-xl font-semibold mb-2">Select a profile</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose an automation profile on the left to view or manage its tasks. Use the buttons to open
                      quick-edit and create panels.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Sliding right panel (drawer) */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 z-50 w-full md:w-[520px] bg-popover shadow-2xl border-l"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={closePanel} aria-label="Close">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-lg font-medium">
                    {view.type === "create-profile" && "New Profile"}
                    {view.type === "edit-profile" && `Edit: ${view.profile.name}`}
                    {view.type === "create-task" && `New Task — ${view.profile.name}`}
                    {view.type === "edit-task" && `Edit Task — ${view.profile.name}`}
                  </h3>
                </div>
              </div>

              <div className="overflow-y-auto p-6 flex-1">
                {/* Render corresponding form inside panel */}
                <div className="space-y-6">
                  {view.type === "create-profile" && (
                    <ProfileForm onBack={closePanel} onSaved={() => setView({ type: "list" })} />
                  )}

                  {view.type === "edit-profile" && (
                    <ProfileForm
                      profile={view.profile}
                      onBack={closePanel}
                      onSaved={() => setView({ type: "list" })}
                    />
                  )}

                  {view.type === "create-task" && (
                    <TaskForm
                      profile={view.profile}
                      onBack={() => setView({ type: "view-tasks", profile: view.profile })}
                      onSaved={() => setView({ type: "view-tasks", profile: view.profile })}
                    />
                  )}

                  {view.type === "edit-task" && (
                    <TaskForm
                      profile={view.profile}
                      task={view.task}
                      onBack={() => setView({ type: "view-tasks", profile: view.profile })}
                      onSaved={() => setView({ type: "view-tasks", profile: view.profile })}
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* backdrop */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closePanel}
            className="fixed inset-0 z-40 bg-black/40"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
