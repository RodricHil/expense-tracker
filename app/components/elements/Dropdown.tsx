"use client";
import CustomSelect from "../CustomSelect";
interface DropdownProps {
  label: string;
  id: string;
  name: string;
  options: string[];
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  error: string;
  required?: boolean;
}
export default function Dropdown({ label, id, name, options, value, onChange, error }: DropdownProps) {
  return <div className="field"><span>{label}</span><CustomSelect id={id} label={label} value={value} options={options.map((option) => ({ value: option, label: option }))} onChange={(next) => onChange({ target: { name, value: next } } as React.ChangeEvent<HTMLSelectElement>)} />{error && <p role="alert" className="text-red-300">{error}</p>}</div>;
}
