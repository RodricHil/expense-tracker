"use client";

import React from 'react';

interface FormInputProps {
    label: string;
    id: string;
    name: string;
    type: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    error: string;
    placeholder:string;
    required?: boolean;
}

const FormInput: React.FC<FormInputProps> = ({ label, id, name, type, value, onChange, error,placeholder, required = false }) => {
    return (
        <div>
            <label htmlFor={id} className="block mb-2 font-medium text-[var(--text)] text-left">
                {label} {required && <span className="text-red-300">*</span>}
            </label>
            {type === 'textarea' ? (
                <textarea
                    id={id}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`border rounded-none p-2 text-[var(--text)] w-full ${error ? 'border-[var(--danger)]' : 'border-[var(--border)]'} outline-none`}
                />
            ) : (
                <input
                    type={type}
                    id={id}
                    name={name}
                    value={value}
                    placeholder={placeholder}
                    onChange={onChange}
                    className={`border rounded-none p-2 w-full text-[var(--text)] ${error ? 'border-[var(--danger)]' : 'border-[var(--border)]'} outline-none`}
                />
            )}
            {error && <p className="text-red-300 text-left mt-1 text-xs">{error}</p>}
        </div>
    );
};

export default FormInput;
