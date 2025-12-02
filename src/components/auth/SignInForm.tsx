import React from "react";
import TextInput from "../common/TextInput";
import Button from "../common/Button";

const SignInForm: React.FC = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 这里先简单跳转到 dashboard，后续再接后端鉴权
    window.location.href = "/dashboard";
  };

  return (
    <form className="signin-form" onSubmit={handleSubmit}>
      <TextInput label="Email" type="email" placeholder="you@example.com" />
      <TextInput label="Password" type="password" placeholder="••••••••" />

      <div className="signin-actions">
        <Button type="submit">Sign in</Button>
        <button className="link-button" type="button">
          Forgot password?
        </button>
      </div>
    </form>
  );
};

export default SignInForm;
