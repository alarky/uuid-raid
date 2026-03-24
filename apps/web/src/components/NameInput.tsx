import { useState } from "react";

interface Props {
  onSubmit: (name: string) => void;
  defaultName?: string;
}

const MAX_LENGTH = 16;

export function NameInput({ onSubmit, defaultName }: Props) {
  const [name, setName] = useState(defaultName ?? "");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, MAX_LENGTH);
    setName(val.toUpperCase());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.length > 0) onSubmit(name);
  };

  return (
    <form onSubmit={handleSubmit} style={{ textAlign: "center" }}>
      <input
        type="text"
        value={name}
        onChange={handleChange}
        maxLength={MAX_LENGTH}
        autoFocus
        autoComplete="off"
        name="raid-callsign"
        id="raid-callsign"
        placeholder="YOUR NAME"
        className="name-input"
      />
      <div style={{ marginTop: "16px" }}>
        <button
          type="submit"
          className="btn"
          style={{ opacity: name.length > 0 ? 1 : 0.3 }}
        >
          OK
        </button>
      </div>
    </form>
  );
}
