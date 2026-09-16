import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const CAMPO_CLASSES =
  "w-full rounded-brand border border-neutral-100 px-3 py-2 text-sm text-foreground outline-none focus:border-secondary-foreground focus:ring-2 focus:ring-secondary disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${CAMPO_CLASSES} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${CAMPO_CLASSES} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${CAMPO_CLASSES} ${props.className ?? ""}`} />;
}

export function PrimaryButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground disabled:opacity-60 ${className ?? ""}`}
    />
  );
}

export function SecondaryButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-full border border-neutral-100 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-neutral-100 disabled:opacity-60 ${className ?? ""}`}
    />
  );
}

export function DangerButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-full border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-60 ${className ?? ""}`}
    />
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="rounded-brand bg-danger/10 px-4 py-2.5 text-sm text-danger">{children}</p>;
}
