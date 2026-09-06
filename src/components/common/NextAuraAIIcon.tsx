import React from 'react';

interface NextAuraAIIconProps extends React.SVGProps<SVGSVGElement> {
  title?: string;
}

export const NextAuraAIIcon: React.FC<NextAuraAIIconProps> = ({ title, ...props }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} {...props}>
    {title && <title>{title}</title>}
    <rect x="2" y="2" width="28" height="28" rx="9" fill="#285143" />
    <path d="M10 21.5V10.8L16 19l6-8.2v10.7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23.4 6.6v3.2M21.8 8.2H25" stroke="#9FE0C4" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
