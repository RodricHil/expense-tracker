"use client";

import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";

interface DropdownProps {
  label: string;
  id: string;
  name: string;
  options: string[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; // Ensure correct type
  error: string;
  required?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
    label,
    id,
    name,
    options,
    value,
    onChange,
    error,
    required = false,
  }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
  
    // Close dropdown if clicked outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setIsDropdownOpen(false);
        }
      };
  
      document.addEventListener("mousedown", handleClickOutside);
  
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);
  
    const handleOptionSelect = (option: string) => {
      onChange({ target: { name, value: option } } as React.ChangeEvent<HTMLSelectElement>); // Use HTMLSelectElement instead of HTMLInputElement
      setIsDropdownOpen(false);
  };
  
  
    return (
      <div>
        <label htmlFor={id} className="block mb-2 font-medium text-white">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative flex items-center" ref={dropdownRef}>
          {/* Dropdown Button */}
          <div
            className={`relative flex items-center border rounded w-full p-2 text-white bg-white cursor-pointer ${
              error ? "border-red-500" : "border-gray-300"
            }`}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="flex items-center justify-between flex-grow min-w-0">
              <span className="truncate pr-1">{value || "Select option"}</span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`w-3 h-3 transition-transform duration-300 ease-in-out ${
                  isDropdownOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </div>
            {/* Dropdown Menu */}
            <div
              className={`absolute top-full z-20 left-0 w-full bg-white-shade-1 border rounded mt-1 ${
                isDropdownOpen ? "block" : "hidden"
              } max-h-72 overflow-y-auto`}
            >
              {options.map((option, index) => (
                <div
                  key={index}
                  onClick={() => handleOptionSelect(option)}
                  className="p-2 cursor-pointer hover:bg-gray-200 border-t"
                >
                  {option}
                </div>
              ))}
            </div>
          </div>
        </div>
        {error && <p className="text-red-500 mt-1 text-xs md:text-sm">{error}</p>}
      </div>
    );
  };

export default Dropdown;
