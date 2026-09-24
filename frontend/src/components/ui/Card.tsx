import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'standard' | 'inverted' | 'borderless';
}

export const Card: React.FC<CardProps> = ({ variant = 'standard', className = '', children, ...props }) => {
  const baseStyles = 'rounded-none transition-all duration-100 ease-linear';
  
  const variants = {
    standard: 'bg-background border border-foreground p-6 md:p-8',
    inverted: 'bg-foreground text-background border-none p-6 md:p-8',
    borderless: 'bg-transparent border-none p-0',
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};
