export type ProviderId = "local" | "s3" | "sftp" | string;

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  schema: Record<string, any>; // simple JSON schema or zod description
}


// //Example dynamic provider form (React + react-hook-form + zod)

// This is a short illustration — use react-hook-form + @hookform/resolvers/zod.// src/components/StorageConfigForm.tsx
// import React, { useEffect, useState } from "react";
// import { useForm } from "react-hook-form";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import api from "../lib/api"; // your fetch wrapper

// export default function StorageConfigForm() {
//   const [providers, setProviders] = useState([]);
//   const [selected, setSelected] = useState(null);

//   useEffect(() => {
//     api.get("/api/backup/providers").then((r) => setProviders(r.data));
//   }, []);

//   const schema = z.object({
//     name: z.string().min(1),
//     providerId: z.string(),
//     config: z.record(z.any())
//   });

//   const { register, handleSubmit, setValue } = useForm({
//     resolver: zodResolver(schema),
//     defaultValues: { name: "", providerId: "", config: {} }
//   });

//   const onSubmit = async (values) => {
//     // test first
//     const { providerId, config } = values;
//     const testRes = await api.post("/api/backups/test-storage", { providerId, config });
//     if (!testRes.success) return alert("Test failed: " + testRes.error);
//     // save
//     await api.post("/api/storage-configs", values);
//     alert("Saved");
//   };

//   // render dynamic fields based on selected provider schema
//   return (
//     <form onSubmit={handleSubmit(onSubmit)}>
//       <input placeholder="Config name" {...register("name")} />
//       <select {...register("providerId")} onChange={(e) => setSelected(e.target.value)}>
//         <option value="">Select provider</option>
//         {providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
//       </select>

//       {selected && (
//         <ProviderDynamicFields providerId={selected} setValue={setValue} />
//       )}

//       <button type="submit">Test & Save</button>
//     </form>
//   );
// }

// // Implement ProviderDynamicFields to fetch provider schema from /api/backup/providers/:id and render inputs
