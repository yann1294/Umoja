import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

type FieldCopy = Readonly<{
  error?: string;
  hint?: string;
  label: string;
  required?: boolean;
}>;

function Description({ id, hint, error }: Readonly<{ id: string; hint?: string; error?: string }>) {
  return (
    <>
      {hint ? (
        <span className="u-field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="u-field__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  return (
    [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined
  );
}

export const TextField = forwardRef<
  HTMLInputElement,
  FieldCopy & InputHTMLAttributes<HTMLInputElement>
>(function TextField({ error, hint, id, label, required, ...props }, ref) {
  if (!id) throw new Error("TextField requires an id");
  return (
    <div className="u-field">
      <label className="u-field__label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        {...props}
        ref={ref}
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className="u-input u-focusable"
      />
      <Description id={id} hint={hint} error={error} />
    </div>
  );
});

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  FieldCopy & TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextAreaField({ error, hint, id, label, required, ...props }, ref) {
  if (!id) throw new Error("TextAreaField requires an id");
  return (
    <div className="u-field">
      <label className="u-field__label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <textarea
        {...props}
        ref={ref}
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className="u-input u-textarea u-focusable"
      />
      <Description id={id} hint={hint} error={error} />
    </div>
  );
});

export const SelectField = forwardRef<
  HTMLSelectElement,
  FieldCopy & SelectHTMLAttributes<HTMLSelectElement>
>(function SelectField({ children, error, hint, id, label, required, ...props }, ref) {
  if (!id) throw new Error("SelectField requires an id");
  return (
    <div className="u-field">
      <label className="u-field__label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <select
        {...props}
        ref={ref}
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className="u-input u-select u-focusable"
      >
        {children}
      </select>
      <Description id={id} hint={hint} error={error} />
    </div>
  );
});

export const CheckboxField = forwardRef<
  HTMLInputElement,
  FieldCopy & Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function CheckboxField({ error, hint, id, label, required, ...props }, ref) {
  if (!id) throw new Error("CheckboxField requires an id");
  return (
    <div className="u-field">
      <label className="u-checkbox" htmlFor={id}>
        <input
          {...props}
          ref={ref}
          id={id}
          type="checkbox"
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, hint, error)}
          className="u-checkbox__control u-focusable"
        />
        <span>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </span>
      </label>
      <Description id={id} hint={hint} error={error} />
    </div>
  );
});

export const FileField = forwardRef<
  HTMLInputElement,
  FieldCopy & Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function FileField({ error, hint, id, label, required, ...props }, ref) {
  if (!id) throw new Error("FileField requires an id");
  return (
    <div className="u-field">
      <label className="u-field__label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        {...props}
        ref={ref}
        id={id}
        type="file"
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        className="u-file u-focusable"
      />
      <Description id={id} hint={hint} error={error} />
    </div>
  );
});
