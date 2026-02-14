"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faTimes,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";

interface PhoneNumberInputProps {
  label: string;
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error: string;
  placeholder: string;
  required?: boolean;
  onCountryCodeChange: (code: string) => void;
  defaultCountryCode?: string;
}

interface CountryApiData {
  name: string;
  dial_code: string;
  flag_url: string;
}

interface Country {
  code: string;
  country: string;
  flag: string;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  label,
  id,
  name,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  onCountryCodeChange,
  defaultCountryCode,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [countryList, setCountryList] = useState<Country[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const didInitDefault = useRef(false);

  /* Fetch countries */
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch("/countries.json");
        const data: CountryApiData[] = await response.json();

        const formatted = data
          .filter((c) => c.dial_code && c.flag_url)
          .map((c) => ({
            code: c.dial_code,
            country: c.name,
            flag: c.flag_url,
          }))
          .sort((a, b) => a.country.localeCompare(b.country));

        setCountryList(formatted);
      } catch (err) {
        console.error("Failed to load countries", err);
      }
    };

    fetchCountries();
  }, []);

  /* Sync default country code */
  /* Sync default country code (run only once) */
  useEffect(() => {
    if (
      didInitDefault.current ||
      !defaultCountryCode ||
      countryList.length === 0
    ) return;

    const match = countryList.find(
      (c) => c.code === defaultCountryCode
    );

    if (match) {
      setSelectedCountry(match);
      onCountryCodeChange(match.code);
      didInitDefault.current = true; // 🔒 lock after first run
    }
  }, [defaultCountryCode, countryList, onCountryCodeChange]);


  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsModalOpen(false);
    onCountryCodeChange(country.code);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(/\D/g, "");
    onChange(e);
  };

  const filteredCountries = countryList.filter(
    (c) =>
      c.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.includes(searchTerm)
  );

  return (
    <div>
      <label htmlFor={id} className="block mb-2 font-medium text-white text-left">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative flex w-full">
        {/* Country Selector */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer border rounded-l-md bg-white text-black
            ${error ? "border-red-500" : "border-gray-300"}`}
        >
          {selectedCountry?.flag && (
            <Image
              src={selectedCountry?.flag || "https://flagcdn.com/w40/in.png"}
              alt={selectedCountry?.country || "India"}
              width={20}
              height={14}
              unoptimized
            />

          )}

          <span
            className={`text-sm font-medium ${selectedCountry?.code && selectedCountry.code.length > 5
              ? "truncate"
              : "whitespace-nowrap"
              }`}
            style={{ maxWidth: "5rem" }}
          >
            {selectedCountry?.code || "+91"}
          </span>

          <FontAwesomeIcon
            icon={faChevronDown}
            className="w-3 h-3 text-gray-500"
          />
        </button>

        {/* Phone Input */}
        <input
          type="tel"
          id={id}
          name={name}
          inputMode="numeric"
          pattern="\d*"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`flex-1 px-3 py-2 border border-l-0 rounded-r-md text-white w-full
            ${error ? "border-red-500" : "border-gray-300"} 
            focus:outline-none outline-none`}
        />
      </div>

      {error && <p className="text-red-500 mt-1 text-xs md:text-sm text-left">{error}</p>}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative bg-white rounded-lg p-4 w-[90%] sm:w-96 z-10">
            <button
              className="absolute top-3 right-3"
              onClick={() => setIsModalOpen(false)}
            >
              <FontAwesomeIcon icon={faTimes}  className="text-black"/>
            </button>

            <h2 className="text-lg font-semibold mb-3 text-black">
              Select Country Code
            </h2>

            <div className="flex items-center border rounded-md px-3 py-2 gap-2 mb-4">
              <FontAwesomeIcon icon={faSearch} className="text-gray-500 w-4" />
              <input
                type="text"
                placeholder="Search country or code"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full outline-none text-black "
              />
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {filteredCountries.map((c) => (
                <div
                  key={`${c.code}-${c.country}`}
                  onClick={() => handleCountrySelect(c)}
                  className="flex items-center p-2 hover:bg-gray-200 cursor-pointer"
                >
                  <Image
                    src={c.flag}
                    alt={c.country}
                    width={20}
                    height={14}
                    className="mr-2"
                    unoptimized
                  />
                  <span className="font-medium text-black">{c.code}</span>
                  <span className="ml-2 text-sm truncate text-black">
                    {c.country}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneNumberInput;
