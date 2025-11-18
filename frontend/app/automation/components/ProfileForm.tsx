"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import CronPreview from "./CronPreview";

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  cron: z.string().min(5, "Cron expression is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileForm({
  defaultValues,
  onSubmit,
  loading = false,
}: {
  defaultValues?: Partial<ProfileFormValues>;
  onSubmit: (data: ProfileFormValues) => void;
  loading?: boolean;
}) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      cron: defaultValues?.cron || "*/10 * * * * *",
      description: defaultValues?.description || "",
      isActive: defaultValues?.isActive ?? true,
    },
  });

  const [cron, setCron] = useState(form.getValues("cron"));

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 p-4"
      >
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Profile Name</FormLabel>
              <FormControl>
                <Input placeholder="Billing Cycle Profile" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Cron */}
        <FormField
          control={form.control}
          name="cron"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Cron Schedule</FormLabel>
              <FormControl>
                <Input
                  placeholder="*/10 * * * * *"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    setCron(e.target.value);
                  }}
                />
              </FormControl>
              <div className="pt-2">
                <CronPreview cron={cron} />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="This profile handles daily invoice reminders…"
                  rows={4}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Active Toggle */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-3">
              <FormControl>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary cursor-pointer"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              </FormControl>
              <FormLabel className="font-medium">Active Profile</FormLabel>
            </FormItem>
          )}
        />

        {/* Save Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto"
        >
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </Form>
  );
}
