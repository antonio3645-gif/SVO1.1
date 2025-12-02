import React from 'react';

export const PriceTagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l7-7a1 1 0 0 0 0-1.42L12 2z" />
    <path d="M7 7h.01" />
  </svg>
);
