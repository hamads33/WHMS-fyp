// /frontend/app/automation/utils/types.ts

/* ------------------------------ Profiles ------------------------------ */
export interface Profile {
  id: number;
  name: string;
  cron: string;
  timezone: string;
  description?: string;
  isActive: boolean;
}

/* -------------------------------- Tasks ------------------------------- */
export interface Task {
  id: number;
  profileId: number;
  name: string;
  actionId: string;
  order: number;
  config: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

/* -------------------------- Actions (Plugins) -------------------------- */
export interface ActionItem {
  id: string;
  name: string;
  description?: string;
  pluginId?: string;
  source?: string;

  // The schema used by DynamicSchemaForm
  jsonSchema?: any;

  // Some plugins expose schema instead of jsonSchema
  schema?: any;

  // Plugin version
  version?: string | number;

  // Any other metadata
  [key: string]: any;
}


/* ------------------------------- Plugins ------------------------------- */
export interface PluginItem {
  id: string;              // backend plugin id
  name: string;
  version?: string;
  description?: string;

  // plugin may expose actions
  actions?: ActionItem[];

  // raw manifest (optional)
  manifest?: any;

  // for UI: used in plugin-client
  _openActionId?: string;
}

/* -------------------------- Upload Response ---------------------------- */
export interface PluginUploadResponse {
  ok: boolean;
  plugin?: PluginItem;      // backend may return plugin
  installed?: PluginItem;   // backend may return installed field
  message?: string;
}
