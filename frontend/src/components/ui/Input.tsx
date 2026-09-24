import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="font-mono text-sm uppercase tracking-widest font-bold">{label}</label>}
      <input 
        className={`bg-background border-b-2 border-foreground rounded-none px-0 py-3 text-base placeholder:italic placeholder:text-mutedForeground focus:border-b-4 focus:outline-none transition-all duration-100 ease-linear ${className}`} 
        {...props} 
      />
    </div>
  );
};
