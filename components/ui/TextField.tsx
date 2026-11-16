import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import styles from "./TextField.module.css";

type FieldWrapperProps = {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
};

function FieldWrapper({ label, htmlFor, error, children }: FieldWrapperProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <span className={styles.error}>{error}</span> : null}
    </div>
  );
}

export function TextField({
  label,
  id,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <FieldWrapper label={label} htmlFor={id!} error={error}>
      <input id={id} className={styles.input} {...props} />
    </FieldWrapper>
  );
}

export function SelectField({
  label,
  id,
  error,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
}) {
  return (
    <FieldWrapper label={label} htmlFor={id!} error={error}>
      <select id={id} className={styles.select} {...props}>
        {children}
      </select>
    </FieldWrapper>
  );
}
