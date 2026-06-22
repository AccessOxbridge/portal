"use client"

import { motion } from "framer-motion";
import { useState, useRef, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { MENTOR_ONBOARDING_QUESTIONS, SUBJECT_OPTIONS } from '@/config/mentor-onboarding.config'
import { COUNTRIES } from '@/config/countries'
import { submitOnboarding } from './actions'
import { PHOTO_ACCEPT_ATTR } from '@/lib/image-upload'
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Flatten all subjects into a single array
const ALL_SUBJECTS = Object.values(SUBJECT_OPTIONS).flat();
// Remove duplicates
const UNIQUE_SUBJECTS = [...new Set(ALL_SUBJECTS)].sort();

export default function OnboardingForm() {
  const [state, formAction] = useActionState(submitOnboarding, null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customExpertise, setCustomExpertise] = useState('');
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);
  const [selectValues, setSelectValues] = useState<Record<string, string>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const customSelectRef = useRef<HTMLDivElement>(null);

  // Phone input state
  const DEFAULT_COUNTRY = COUNTRIES.find(c => c.code === 'GB')!
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY)
  const [phoneDigits, setPhoneDigits] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false)
  const countryDropdownRef = useRef<HTMLDivElement>(null)
  const countrySearchInputRef = useRef<HTMLInputElement>(null)

  const filteredCountries = countrySearch.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.dialCode.includes(countrySearch)
      )
    : COUNTRIES

  // Close subject dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
        setCountrySearch('');
      }
      // Close any open custom select if clicking outside
      if (customSelectRef.current && !customSelectRef.current.contains(event.target as Node)) {
        setOpenSelectId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const filteredSubjects = searchQuery.trim()
    ? UNIQUE_SUBJECTS.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    : UNIQUE_SUBJECTS;

  const hasFileErrors = Object.values(fileErrors).some(Boolean);

  const validateFileSize =
    (questionId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];

      // Clear any previous error when user clears selection
      if (!file) {
        setFileErrors(prev => ({ ...prev, [questionId]: '' }));
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileErrors(prev => ({
          ...prev,
          [questionId]: `Max file size is ${MAX_FILE_SIZE_MB}MB.`,
        }));
        // Clear the input so the form can't submit the oversized file
        e.target.value = '';
        return;
      }

      setFileErrors(prev => ({ ...prev, [questionId]: '' }));
    };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // 1. Check for file errors (file size etc)
    if (hasFileErrors) {
      e.preventDefault();
      const firstErrorField = Object.entries(fileErrors).find(([, msg]) => Boolean(msg))?.[0];
      if (firstErrorField) {
        document.getElementById(firstErrorField)?.focus();
      }
      return;
    }

    // 2. Validate phone number digits
    if (phoneDigits.length < 6 || phoneDigits.length > 10) {
      e.preventDefault();
      setFieldErrors(prev => ({ ...prev, phone_number: 'Please enter between 6 and 10 digits (excluding the country code).' }));
      document.getElementById('phone_number_digits')?.focus();
      return;
    }
    setFieldErrors(prev => ({ ...prev, phone_number: '' }));

    // 3. Validate LinkedIn URL format (if provided)
    const form = e.currentTarget;
    const linkedinInput = form.elements.namedItem('linkedin_url') as HTMLInputElement | null;
    const linkedinValue = linkedinInput?.value.trim() ?? '';
    if (linkedinValue) {
      const isValidLinkedIn = /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+\/?$/.test(linkedinValue);
      if (!isValidLinkedIn) {
        e.preventDefault();
        setFieldErrors(prev => ({ ...prev, linkedin_url: 'Please enter a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/yourname)' }));
        linkedinInput?.focus();
        return;
      }
    }
    setFieldErrors(prev => ({ ...prev, linkedin_url: '' }));

    // 3. Validate required custom selects
    const requiredSelects = MENTOR_ONBOARDING_QUESTIONS.filter(q => q.type === 'select' && q.required);
    for (const q of requiredSelects) {
      if (!selectValues[q.id]) {
        e.preventDefault();
        setOpenSelectId(q.id);
        document.querySelector<HTMLButtonElement>(`button[data-select-id="${q.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    // 4. Check for required multiselects (like subjects)
    // Since these are custom components, native HTML validation might not catch them
    const requiredQuestions = MENTOR_ONBOARDING_QUESTIONS.filter(q => q.required);
    for (const q of requiredQuestions) {
      if (q.type === 'multiselect' && q.id === 'expertise' && selectedSubjects.length === 0) {
        e.preventDefault();
        setIsDropdownOpen(true);
        // Scroll to the dropdown trigger
        dropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
  };

  return (
    <div className="min-h-screen bg-accent text-white relative">
      {/* Logo – aligned with grid content */}
      <div className="max-w-7xl mx-auto px-8 lg:px-12 pt-10">
        <Logo className="justify-start" textColor="white" />
      </div>
      {/* Sign Out – absolute top-right of the blue section */}
      <div className="absolute top-10 right-8 lg:right-12">
        <LogoutButton className="text-white/50 hover:text-white bg-white/5 border border-white/10 rounded-xl px-3 py-1.5" />
      </div>
      <div className="max-w-7xl mx-auto px-8 lg:px-12 ">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
          {/* Left Side: Header & Form */}
          <div className="space-y-16 mt-12">
            <div className="space-y-8">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-6xl lg:text-[100px] font-serif leading-none tracking-tight"
              >
                Mentor Onboarding
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="text-gray-300 text-lg lg:text-xl max-w-md font-light leading-relaxed"
              >
                Help us understand your expertise and background.
              </motion.p>
            </div>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              action={formAction}
              onSubmit={handleSubmit}
              className="space-y-8 max-w-md"
            >
              {state?.error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg text-sm">
                  {state.error}
                </div>
              )}
              {MENTOR_ONBOARDING_QUESTIONS.map((question) => (
                <div key={question.id} className="group">
                  <label htmlFor={question.id} className="block text-sm text-gray-400 mb-1 group-focus-within:text-white transition-colors">
                    {question.label} {question.required && <span className="text-red-500">*</span>}
                  </label>

                  {question.type === 'phone' && (
                    <div className="space-y-1">
                      {/* Hidden input carries the full number to Supabase */}
                      <input type="hidden" name="phone_number" value={`${selectedCountry.dialCode}${phoneDigits}`} />
                      <div className="flex items-stretch gap-0 border-b border-gray-700 focus-within:border-white transition-all duration-300">
                        {/* Country code button */}
                        <div ref={countryDropdownRef} className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCountryDropdownOpen(prev => !prev)
                              if (!isCountryDropdownOpen) {
                                setTimeout(() => countrySearchInputRef.current?.focus(), 50)
                              }
                            }}
                            className="flex items-center gap-1.5 pr-2 py-2 text-sm text-white hover:text-white/80 transition-colors"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`} alt={selectedCountry.name} width={20} height={14} className="rounded-[2px] object-cover" />
                            <span className="font-mono text-sm">{selectedCountry.dialCode}</span>
                            <svg className={`w-3 h-3 text-gray-400 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Country dropdown */}
                          {isCountryDropdownOpen && (
                            <div className="absolute z-30 top-full left-0 mt-1 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
                              <div className="p-2 border-b border-gray-700 sticky top-0 bg-gray-900">
                                <input
                                  ref={countrySearchInputRef}
                                  type="text"
                                  value={countrySearch}
                                  onChange={e => setCountrySearch(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Escape') {
                                      setIsCountryDropdownOpen(false)
                                      setCountrySearch('')
                                    }
                                    if (e.key === 'Enter' && filteredCountries.length > 0) {
                                      e.preventDefault()
                                      setSelectedCountry(filteredCountries[0])
                                      setIsCountryDropdownOpen(false)
                                      setCountrySearch('')
                                    }
                                  }}
                                  placeholder="Search country or code…"
                                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-white text-white placeholder:text-gray-500"
                                />
                              </div>
                              <div className="overflow-y-auto max-h-52">
                                {filteredCountries.map(country => (
                                  <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCountry(country)
                                      setIsCountryDropdownOpen(false)
                                      setCountrySearch('')
                                      document.getElementById('phone_number_digits')?.focus()
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-gray-800 transition-colors ${
                                      country.code === selectedCountry.code ? 'bg-white/10 text-white' : 'text-gray-300'
                                    }`}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`} alt={country.name} width={20} height={14} className="rounded-[2px] object-cover shrink-0" />
                                    <span className="flex-1 truncate">{country.name}</span>
                                    <span className="font-mono text-gray-400 text-xs shrink-0">{country.dialCode}</span>
                                  </button>
                                ))}
                                {filteredCountries.length === 0 && (
                                  <div className="px-3 py-6 text-center text-gray-500 text-sm">No country found</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Divider */}
                        <span className="self-center text-gray-600 pr-2">|</span>

                        {/* Digits input */}
                        <input
                          type="text"
                          id="phone_number_digits"
                          inputMode="numeric"
                          value={phoneDigits}
                          onChange={e => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                            setPhoneDigits(digits)
                            if (fieldErrors.phone_number) setFieldErrors(prev => ({ ...prev, phone_number: '' }))
                          }}
                          placeholder={question.placeholder}
                          required={question.required}
                          className="flex-1 bg-transparent py-2 focus:outline-none text-white placeholder:text-gray-600 text-sm"
                        />
                      </div>
                      {fieldErrors.phone_number && (
                        <p className="text-xs text-red-400">{fieldErrors.phone_number}</p>
                      )}
                    </div>
                  )}

                  {question.type === 'text' && (
                    <div className="space-y-1">
                      <input
                        type="text"
                        id={question.id}
                        name={question.id}
                        required={question.required}
                        placeholder={question.placeholder}
                        onChange={() => {
                          if (fieldErrors[question.id]) {
                            setFieldErrors(prev => ({ ...prev, [question.id]: '' }))
                          }
                        }}
                        aria-invalid={Boolean(fieldErrors[question.id])}
                        className={`w-full bg-transparent border-b py-2 focus:outline-none transition-all duration-300 ${
                          fieldErrors[question.id] ? 'border-red-500 focus:border-red-400' : 'border-gray-700 focus:border-white'
                        }`}
                      />
                      {fieldErrors[question.id] && (
                        <p className="text-xs text-red-400">{fieldErrors[question.id]}</p>
                      )}
                    </div>
                  )}

                  {question.type === 'textarea' && (
                    <textarea
                      id={question.id}
                      name={question.id}
                      required={question.required}
                      placeholder={question.placeholder}
                      rows={3}
                      className="w-full bg-transparent border-b border-gray-700 py-2 focus:outline-none focus:border-white transition-all duration-300 resize-none min-h-[80px]"
                    />
                  )}

                  {question.type === 'file' && (
                    <div className="space-y-1">
                      <input
                        type="file"
                        id={question.id}
                        name={question.id}
                        required={question.required}
                        accept={question.id === 'photo' ? PHOTO_ACCEPT_ATTR : '.pdf,.doc,.docx'}
                        onChange={validateFileSize(question.id)}
                        aria-invalid={Boolean(fileErrors[question.id])}
                        aria-describedby={`${question.id}-help ${question.id}-error`}
                        className="w-full bg-transparent border-b border-gray-700 py-2 focus:outline-none focus:border-white transition-all duration-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600"
                      />
                      <p id={`${question.id}-help`} className="text-xs text-gray-400">
                        Max file size is {MAX_FILE_SIZE_MB}MB.
                      </p>
                      {fileErrors[question.id] && (
                        <p id={`${question.id}-error`} className="text-xs text-red-400">
                          {fileErrors[question.id]}
                        </p>
                      )}
                    </div>
                  )}

                  {question.type === 'select' && (
                    <div ref={customSelectRef} className="relative">
                      {/* Hidden native input for form submission */}
                      <input type="hidden" name={question.id} value={selectValues[question.id] ?? ''} />
                      <button
                        type="button"
                        data-select-id={question.id}
                        onClick={() => setOpenSelectId(prev => prev === question.id ? null : question.id)}
                        className="w-full flex items-center justify-between border-b border-gray-700 py-2 text-left hover:border-white transition-all duration-300"
                      >
                        <span className={selectValues[question.id] ? 'text-white' : 'text-gray-400'}>
                          {selectValues[question.id] ?? 'Select an option'}
                        </span>
                        <svg
                          width="12" height="12" viewBox="0 0 12 12" fill="none"
                          className={`text-gray-400 transition-transform duration-200 ${openSelectId === question.id ? 'rotate-180' : ''}`}
                        >
                          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {openSelectId === question.id && (
                        <div className="absolute z-20 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                          {question.options?.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setSelectValues(prev => ({ ...prev, [question.id]: option }))
                                setOpenSelectId(null)
                              }}
                              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-800 transition-colors ${
                                selectValues[question.id] === option ? 'text-white bg-white/10' : 'text-gray-300'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {question.type === 'multiselect' && (
                    <div ref={dropdownRef} className="relative">
                      {/* Hidden inputs for form submission */}
                      {selectedSubjects.map((subject) => (
                        subject === 'Other' ? null : <input key={subject} type="hidden" name={question.id} value={subject} />
                      ))}
                      {selectedSubjects.includes('Other') && (
                        <input type="hidden" name={question.id} value={customExpertise} />
                      )}

                      {/* Selected tags */}
                      {selectedSubjects.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {selectedSubjects.map((subject) => (
                            <span
                              key={subject}
                              className="inline-flex items-center gap-1 bg-white/10 text-white text-xs px-2 py-1 rounded-full"
                            >
                              <span className="max-w-[150px] truncate">{subject}</span>
                              <button
                                type="button"
                                onClick={() => toggleSubject(subject)}
                                className="hover:bg-white/20 rounded-full p-0.5"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Dropdown trigger */}
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between border-b border-gray-700 py-2 text-left hover:border-white transition-all duration-300"
                      >
                        <span className="text-gray-400">
                          {selectedSubjects.length === 0
                            ? 'Click to select subjects...'
                            : `${selectedSubjects.length} subject${selectedSubjects.length > 1 ? 's' : ''} selected`}
                        </span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown menu */}
                      {isDropdownOpen && (
                        <div className="absolute z-20 mt-2 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-hidden">
                          {/* Search */}
                          <div className="p-2 border-b border-gray-700 sticky top-0 bg-gray-900">
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search subjects..."
                              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-white"
                              autoFocus
                            />
                          </div>

                          {/* Options list */}
                          <div className="overflow-y-auto max-h-48">
                            {filteredSubjects.map((subject) => (
                              <button
                                key={subject}
                                type="button"
                                onClick={() => toggleSubject(subject)}
                                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-800 transition-colors ${selectedSubjects.includes(subject) ? 'bg-white/10 text-white' : 'text-gray-300'
                                  }`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedSubjects.includes(subject) ? 'bg-white border-white' : 'border-gray-600'
                                  }`}>
                                  {selectedSubjects.includes(subject) && (
                                    <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                {subject}
                              </button>
                            ))}
                            {filteredSubjects.length === 0 && (
                              <div className="px-3 py-6 text-center text-gray-500 text-sm">
                                No subjects found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {question.id === 'expertise' && selectedSubjects.includes('Other') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4"
                    >
                      <label htmlFor="custom-expertise" className="block text-sm text-gray-400 mb-1">
                        Please specify your expertise <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="custom-expertise"
                        value={customExpertise}
                        onChange={(e) => setCustomExpertise(e.target.value)}
                        required
                        placeholder="e.g. Underwater Basket Weaving"
                        className="w-full bg-transparent border-b border-gray-700 py-2 focus:outline-none focus:border-white transition-all duration-300"
                      />
                    </motion.div>
                  )}
                </div>
              ))}

              <SubmitButton hasFileErrors={hasFileErrors} />

              <p className="text-center text-xs text-gray-400 mt-6">
                By submitting, you agree to our terms of service and mentor guidelines.
              </p>
            </motion.form>
          </div>

          {/* Right Side: Info */}
          <div className="lg:pt-[360px] space-y-16 lg:pl-12">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-gray-400 font-serif text-lg mb-4">What we look for</h3>
                <p className="text-xl text-gray-200 font-light leading-relaxed">
                  Passionate mentors who want to help students achieve their academic goals and unlock their potential.
                </p>
              </div>

              <div className="pt-8">
                <h3 className="text-gray-400 font-serif text-lg mb-4">Next steps</h3>
                <p className="text-xl text-gray-200 font-light leading-relaxed">
                  After submission, our team will review your application within 2-3 business days.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmitButton({ hasFileErrors }: { hasFileErrors: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || hasFileErrors}
      className={`w-full py-4 transition-all duration-300 font-medium tracking-widest text-sm uppercase mt-8 flex items-center justify-center gap-2
        ${pending || hasFileErrors
          ? 'bg-[#333333] text-gray-500 cursor-not-allowed'
          : 'bg-white text-black hover:bg-black hover:text-white active:scale-[0.98]'
        }`}
    >
      {pending ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </>
      ) : (
        "Submit Application"
      )}
    </button>
  );
}
