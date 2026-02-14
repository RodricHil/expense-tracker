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
            <label htmlFor={id} className="block mb-2 font-medium text-white text-left">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {type === 'textarea' ? (
                <textarea
                    id={id}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`border rounded p-2 text-white w-full ${error ? 'border-red-500' : 'border-gray-300'} outline-none`}
                />
            ) : (
                <input
                    type={type}
                    id={id}
                    name={name}
                    value={value}
                    placeholder={placeholder}
                    onChange={onChange}
                    className={`border rounded p-2 w-full text-white ${error ? 'border-red-500' : 'border-gray-300'} outline-none`}
                />
            )}
            {error && <p className="text-red-500 text-left mt-1 text-xs md:text-sm">{error}</p>}
        </div>
    );
};

export default FormInput;
