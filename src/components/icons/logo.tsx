import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2L4 5v6.09c0 4.94 3.4 9.24 8 10.91 4.6-1.67 8-5.97 8-10.91V5l-8-3z" fill="hsl(var(--primary))" stroke="none" />
      <path d="M17.5 15.5L6.5 4.5" stroke="hsl(var(--background))" strokeWidth="2.5" />
      <path d="M6.5 15.5L17.5 4.5" stroke="hsl(var(--background))" strokeWidth="2.5" />
      <path d="M17.5 15.5L6.5 4.5" stroke="currentColor" />
      <path d="M6.5 15.5L17.5 4.5" stroke="currentColor" />
    </svg>
  );
}
