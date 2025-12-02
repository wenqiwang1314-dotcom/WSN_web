import React from "react";

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const TextInput: React.FC<TextInputProps> = ({ label, ...props }) => {
  return (
    <label className="input-field">
      {label && <span className="input-label">{label}</span>}
      <input className="input-control" {...props} />
    </label>
  );
};

export default TextInput;
