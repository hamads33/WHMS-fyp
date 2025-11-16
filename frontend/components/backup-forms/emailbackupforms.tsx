"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

const schema = z.object({
  emailAddress: z.string().email("Please enter a valid email address"),
});

export default function EmailBackupForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (values: any) => {
    toast(<pre>{JSON.stringify(values, null, 2)}</pre>);
  };

  return (
    <div className="flex justify-center items-center w-full">
      <Card className="w-[500px] rounded-xl shadow-lg border">
        <CardHeader>
          <CardTitle>Daily Email Backups</CardTitle>
          <CardDescription>
            Backups will be emailed to the address below.
          </CardDescription>
        </CardHeader>

        <CardContent>

          {/* INFO ALERT */}
          <div className="flex items-start gap-3 p-4 mb-4 rounded-md bg-blue-50 border border-blue-200">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <p className="text-sm text-blue-800 leading-tight">
              This backup option may fail with large databases due to system
              memory or execution limits. For larger installations, we
              recommend using cPanel Backup or another backup solution.
            </p>
          </div>

          {/* FORM */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <FormField
                control={form.control}
                name="emailAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="yourname@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the email address where backups should be delivered.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <CardFooter className="p-0">
                <Button className="w-full" type="submit">
                  Save & Activate
                </Button>
              </CardFooter>
              
            </form>
          </Form>

        </CardContent>
      </Card>
    </div>
  );
}
