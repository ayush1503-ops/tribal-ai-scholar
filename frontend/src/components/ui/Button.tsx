import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', children, ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center font-mono uppercase tracking-widest text-sm font-bold transition-all duration-100 ease-linear focus-visible:outline focus-visible:outline-3 focus-visible:outline-foreground focus-visible:outline-offset-3 rounded-none disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-foreground text-background border-2 border-foreground hover:bg-background hover:text-foreground px-8 py-4',
    secondary: 'bg-transparent text-foreground border-2 border-foreground hover:bg-foreground hover:text-background px-8 py-4',
    ghost: 'bg-transparent text-foreground border-none hover:underline underline-offset-4 px-4 py-2',
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
