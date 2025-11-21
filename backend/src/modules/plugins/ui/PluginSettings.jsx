// src/modules/plugins/ui/PluginSettings.jsx
import React, { useState, useEffect } from "react";

export default function PluginSettings({ pluginId }) {
  const [settings, setSettings] = useState([]);
  const [keyInp, setKeyInp] = useState("");
  const [valueInp, setValueInp] = useState("");

  useEffect(() => {
    fetch(`/api/plugins/settings/${pluginId}`).then(r => r.json()).then(j => setSettings(j.data || []));
  }, [pluginId]);

  async function save() {
    const res = await fetch(`/api/plugins/settings/${pluginId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: keyInp, value: JSON.parse(valueInp || "null") })
    });
    const json = await res.json();
    setSettings(prev => [...prev.filter(s => s.key !== json.data.key), json.data]);
  }

  return (
    <div>
      <h3>Plugin Settings: {pluginId}</h3>
      <ul>{settings.map(s => <li key={s.id}><b>{s.key}</b>: <pre>{JSON.stringify(s.value)}</pre></li>)}</ul>
      <div>
        <input placeholder="key" value={keyInp} onChange={e => setKeyInp(e.target.value)} />
        <textarea placeholder='value (JSON)' value={valueInp} onChange={e => setValueInp(e.target.value)} />
        <button onClick={save}>Save</button>
      </div>
    </div>
  );
}
