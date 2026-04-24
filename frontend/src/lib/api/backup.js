import { backupApi } from "./backupClient";

export const BackupAPI = {
  list() {
    return backupApi("");
  },

  get(id) {
    return backupApi(`/${id}`);
  },

  create(payload) {
    return backupApi("", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  restore(id, payload) {
    return backupApi(`/${id}/restore`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  downloadUrl(id) {
    return `${process.env.NEXT_PUBLIC_API_URL}/api/backups/${id}/download`;
  },
};
