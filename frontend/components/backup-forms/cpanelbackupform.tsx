"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const schema = z.object({
  whmApiUsername: z.string().min(1),
  whmApiToken: z.string().min(1),
  cpanelUsername: z.string().min(1),

  backupDestination: z.string().min(1),

  ftpHostname: z.string().min(1),
  ftpPort: z.string().min(1),
  ftpUsername: z.string().min(1),
  ftpPassword: z.string().min(1),
  ftpDirectory: z.string().min(1),

  emailAddress: z.string().email().optional(),
});

export default function CpanelBackupForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      backupDestination: "ftp",
    },
  });

  const onSubmit = (values: any) => {
    toast(<pre>{JSON.stringify(values, null, 2)}</pre>);
  };

  return (
    <div className="flex justify-center items-center w-full">
      <Card className="w-[500px] rounded-xl shadow-lg border">
        <CardHeader>
          <CardTitle>cPanel Backup Settings</CardTitle>
          <CardDescription>Enter WHM and remote backup information.</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* WHM API SECTION */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="whmApiUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WHM API Username</FormLabel>
                      <FormControl>
                        <Input placeholder="root" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpanelUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>cPanel Username</FormLabel>
                      <FormControl>
                        <Input placeholder="cpaneluser" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="whmApiToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WHM API Token</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="API Token" {...field} />
                    </FormControl>
                    <FormDescription>
                      Generate in WHM → Development → Manage API Tokens
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* BACKUP DESTINATION */}
          <FormField
  control={form.control}
  name="backupDestination"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Backup Destination</FormLabel>
      <FormControl>
        <Select onValueChange={field.onChange} defaultValue={field.value}>
          <SelectTrigger>
            <SelectValue placeholder="Select destination" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">Local Backup Directory</SelectItem>
            <SelectItem value="ftp">Remote FTP Server</SelectItem>
            <SelectItem value="ftp_passive">Remote FTP Server (Passive Mode)</SelectItem>
            <SelectItem value="scp">Secure Copy (SCP)</SelectItem>
          </SelectContent>
        </Select>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>


              {/* HOSTNAME + PORT */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ftpHostname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remote Destination Hostname</FormLabel>
                      <FormControl>
                        <Input placeholder="ftp.example.com" {...field} />
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
                      <FormLabel>Port</FormLabel>
                      <FormControl>
                        <Input placeholder="22" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* USER + PASSWORD */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ftpUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remote Destination User</FormLabel>
                      <FormControl>
                        <Input placeholder="youruser@example.com" {...field} />
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
                      <FormLabel>Remote Destination Password</FormLabel>
                      <FormControl>
                        <Input placeholder="FTP Password" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* DIRECTORY */}
              <FormField
                control={form.control}
                name="ftpDirectory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remote Destination Directory</FormLabel>
                    <FormControl>
                      <Input placeholder="/backups/whmcs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* EMAIL */}
              <FormField
                control={form.control}
                name="emailAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="notify@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      This email receives confirmation when backup completes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* BUTTONS */}
              <CardFooter className="flex flex-col gap-3 p-0">
                <Button className="w-full" type="submit">Test Connection</Button>
                <Button variant="secondary" className="w-full">Save & Activate</Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
