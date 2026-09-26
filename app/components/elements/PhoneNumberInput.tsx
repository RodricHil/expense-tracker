"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  // ET-L5: the country the user explicitly picked. `null` means "not picked yet",
  // in which case the default derived from `defaultCountryCode` is shown instead.
  const [pickedCountry, setPickedCountry] = useState<Country | null>(null);
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

  /**
   * ET-L5 — the default country is DERIVED, not copied into state.
   *
   * This used to be a `useEffect` that called `setSelectedCountry(match)` the
   * moment the country list arrived — a synchronous setState inside an effect
   * (`react-hooks/set-state-in-effect`), and a cascading render. Deriving it
   * during render removes both, and removes the window in which the component
   * rendered with a stale `null` selection.
   *
   * The effect that remains does the one thing an effect is for: telling an
   * external system (the parent form) about the resolved default. It is not a
   * state copy, and the ref still limits it to a single notification.
   */
  const defaultCountry = useMemo(
    () => countryList.find((c) => c.code === defaultCountryCode) ?? null,
    [countryList, defaultCountryCode]
  );

  const selectedCountry = pickedCountry ?? defaultCountry;

  useEffect(() => {
    if (didInitDefault.current || !defaultCountry) return;

    didInitDefault.current = true; // 🔒 notify the parent once, not per render
    onCountryCodeChange(defaultCountry.code);
  }, [defaultCountry, onCountryCodeChange]);


  const handleCountrySelect = (country: Country) => {
    setPickedCountry(country);
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
      <label htmlFor={id} className="block mb-2 font-medium text-[var(--text)] text-left">
        {label} {required && <span className="text-red-300">*</span>}
      </label>

      <div className="relative flex w-full">
        {/* Country Selector */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer border rounded-none bg-[var(--surface)] text-[var(--text)]
            ${error ? "border-red-500" : "border-stone-300"}`}
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
            className="w-3 h-3 text-stone-500"
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
          className={`flex-1 px-3 py-2 border border-l-0 rounded-none text-[var(--text)] w-full
            ${error ? "border-red-500" : "border-stone-300"}
            focus:outline-none outline-none`}
        />
      </div>

      {error && <p className="text-red-300 mt-1 text-xs text-left">{error}</p>}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative bg-[var(--surface)] rounded-none p-4 w-[90%] sm:w-96 z-10">
            <button
              className="absolute top-3 right-3"
              onClick={() => setIsModalOpen(false)}
            >
              <FontAwesomeIcon icon={faTimes}  className="text-[var(--text)]"/>
            </button>

            <h2 className="text-lg font-semibold mb-3 text-[var(--text)]">
              Select Country Code
            </h2>

            <div className="flex items-center border rounded-none px-3 py-2 gap-2 mb-4">
              <FontAwesomeIcon icon={faSearch} className="text-stone-500 w-4" />
              <input
                type="text"
                placeholder="Search country or code"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full outline-none text-[var(--text)] "
              />
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {filteredCountries.map((c) => (
                <div
                  key={`${c.code}-${c.country}`}
                  onClick={() => handleCountrySelect(c)}
                  className="flex items-center p-2 hover:bg-stone-200 cursor-pointer"
                >
                  <Image
                    src={c.flag}
                    alt={c.country}
                    width={20}
                    height={14}
                    className="mr-2"
                    unoptimized
                  />
                  <span className="font-medium text-[var(--text)]">{c.code}</span>
                  <span className="ml-2 text-sm truncate text-[var(--text)]">
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
