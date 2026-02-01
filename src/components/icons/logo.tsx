import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <g transform="rotate(0 12 12)">
        <path d="M12 2C9.25 2 7 4.25 7 7c0 1.95 1.05 3.65 2.65 4.55L7.9 13.3c-1.95.8-3.4 2.6-3.4 4.7 0 2.75 2.25 5 5 5s5-2.25 5-5c0-2.1-1.45-3.9-3.4-4.7l-1.75-1.75C15.95 10.65 17 8.95 17 7c0-2.75-2.25-5-5-5zm0 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zM4 2h2v4H4zm14 0h2v4h-2z" transform="scale(0.8) translate(2.5, 1)"/>
        <path d="M4.5 9.5l15 5" stroke="hsl(var(--background))" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M19.5 9.5l-15 5" stroke="hsl(var(--background))" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M4.5 9.5l15 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M19.5 9.5l-15 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
