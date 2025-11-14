"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Server } from "lucide-react";
import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { ControllerRenderProps } from "react-hook-form";

const formSchema = z.object({
  module: z.string().min(1, "Select a module"),
  hostname: z.string().min(1, "Hostname or IP is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  apiToken: z.string().min(1, "API token is required"),
});
type ServerFormValues = z.infer<typeof formSchema>;

const modules = [
  { label: "cPanel", value: "cpanel" },
  { label: "Plesk", value: "plesk" },
  { label: "DirectAdmin", value: "directadmin" },
  { label: "Custom API", value: "custom" },
] as const;

export default function ServerForm() {
  const form = useForm<ServerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      module: "",
      hostname: "",
      username: "",
      password: "",
      apiToken: "",
    },
  });

  const onSubmit = (values: ServerFormValues) => {
    toast(
      <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
        <code className="text-white">{JSON.stringify(values, null, 2)}</code>
      </pre>
    );
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <Server className="size-4" />
          </div>
          Add Server
        </a>
        <p className="text-center text-muted-foreground mb-2">
          Enter your server connection details below.
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Module */}
            <FormField
              control={form.control}
              name="module"
              render={({
                field,
              }: {
                field: ControllerRenderProps<ServerFormValues, "module">;
              }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Module</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? modules.find((m) => m.value === field.value)?.label
                            : "Select module"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search module..." />
                        <CommandList>
                          <CommandEmpty>No module found.</CommandEmpty>
                          <CommandGroup>
                            {modules.map((m) => (
                              <CommandItem
                                key={m.value}
                                onSelect={() => form.setValue("module", m.value)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    m.value === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {m.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Choose the control panel or API this server uses.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hostname */}
            <FormField
              control={form.control}
              name="hostname"
              render={({
                field,
              }: {
                field: ControllerRenderProps<ServerFormValues, "hostname">;
              }) => (
                <FormItem>
                  <FormLabel>Hostname or IP Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. server.domain.com"
                      type="text"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Used to connect to your server’s API.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Username */}
            <FormField
              control={form.control}
              name="username"
              render={({
                field,
              }: {
                field: ControllerRenderProps<ServerFormValues, "username">;
              }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="root" type="text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({
                field,
              }: {
                field: ControllerRenderProps<ServerFormValues, "password">;
              }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* API Token */}
            <FormField
              control={form.control}
              name="apiToken"
              render={({
                field,
              }: {
                field: ControllerRenderProps<ServerFormValues, "apiToken">;
              }) => (
                <FormItem>
                  <FormLabel>API Token</FormLabel>
                  <FormControl>
                    <Input placeholder="API token string" type="text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
              {form.formState.isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
