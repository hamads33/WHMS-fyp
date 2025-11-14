import MyForm from "@/app/servers/server-form";

export default function AddServerPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <MyForm />
      </div>
    </div>
  );
}
