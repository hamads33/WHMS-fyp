"use client";

import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";

interface Props {
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

export default function JsonEditor({
  value,
  onChange,
  height = "320px",
}: Props) {
  return (
    <div className="border rounded-lg bg-card">
      <CodeMirror
        value={value}
        height={height}
        theme={oneDark}
        extensions={[json()]}
        onChange={(val) => onChange(val)}
      />
    </div>
  );
}
