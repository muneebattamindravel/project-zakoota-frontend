import React from 'react';
import Spinner from './Spinner';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean;
  pendingText?: string;
};

export default function LoadingButton({
  pending,
  pendingText,
  className = '',
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={pending || disabled}
      className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm transition
        ${pending ? 'opacity-80 cursor-not-allowed' : ''} ${className}`}
    >
      {pending ? (
        <>
          <Spinner />
          <span>{pendingText || 'Working…'}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
