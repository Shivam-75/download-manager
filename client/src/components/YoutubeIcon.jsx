import React from "react";

export default function YoutubeIcon({ className, size = 24, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12.5a29 29 0 0 0 .46 6.08 2.78 2.78 0 0 0 1.95 1.96C5.12 21 12 21 12 21s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12.5a29 29 0 0 0-.46-6.08z" />
      <polygon points="9.75 15.02 15.5 12.5 9.75 9.98 9.75 15.02" fill="currentColor" />
    </svg>
  );
}
