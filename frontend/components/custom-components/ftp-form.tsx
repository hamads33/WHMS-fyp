"use client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Import Shadcn UI components
import { Button } from "@/components/ui/button";
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { InfoBox } from "../ui/info-box";

const formSchema = z.object({
  ftpHostname: z.string().min(1),
  ftpPort: z.string().min(1),
  ftpUsername: z.string().min(1),
  ftpPassword: z.string().min(1),
  ftpDestination: z.string().min(1),
  useSftp: z.boolean().default(true).optional(),
  passiveMode: z.boolean().default(true).optional(),
});

export default function FtpForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      console.log(values);
      toast(
        <pre className="toast-preview mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      );
    } catch (error) {
      console.error("Form submission error", error);
      toast.error("Failed to submit the form. Please try again.");
    }
  }

  return (
    <div className="form-layout flex items-center justify-center min-h-screen bg-background">
      <Card className="card-ftp w-[500px] rounded-xl shadow-lg border">
        <CardHeader className="card-ftp-header">
          <CardTitle>FTP Details</CardTitle>
          <CardDescription>
            Enter your FTP credentials to continue.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Info Box — clean spacing, no layout breaking */}
              <InfoBox>
                This backup option may fail to complete successfully with large databases due to system memory or time execution limits. For larger installations, we recommend using cPanel Backup or an alternative backup solution.
                 </InfoBox>

              {/* Hostname + Port */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ftpHostname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FTP Hostname</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="www.example.com"
                          type="text"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ftpPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FTP Port</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="21"
                          type="text"
                          {...field}
                        />
                      </FormControl>
                      {/* FormDescription removed for perfect alignment */}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Username + Password */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ftpUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FTP Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="youruser@example.com"
                          type="text"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ftpPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FTP Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="FTP Password"
                          type="password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Destination path */}
              <FormField
                control={form.control}
                name="ftpDestination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FTP Destination</FormLabel>
                    <FormControl>
                      <Input placeholder="/" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Checkbox Row */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="useSftp"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center p-4 border rounded-md bg-muted">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="ml-2">
                        <FormLabel>Use Secure FTP/SFTP (Recommended)</FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passiveMode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center p-4 border rounded-md bg-muted">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="ml-2">
                        <FormLabel>FTP Passive Mode</FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <CardFooter className="card-ftp-footer">
                <Button className="w-full" type="submit">
                  Test Connection
                </Button>
              </CardFooter>

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
