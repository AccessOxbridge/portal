"use client"

import { motion } from "framer-motion";
import { useState, useRef, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, ChevronDown, FileText, GraduationCap, Paperclip, Search, Upload, UserRound, X } from "lucide-react";
import { MENTOR_ONBOARDING_QUESTIONS, SUBJECT_OPTIONS, type OnboardingQuestion } from '@/config/mentor-onboarding.config'
import { COUNTRIES } from '@/config/countries'
import { submitOnboarding } from './actions'
import { PHOTO_ACCEPT_ATTR } from '@/lib/image-upload'
import Image from "next/image";
import { LogoutButton } from "@/components/logout-button";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Subjects are shown grouped (Cambridge, Oxford, A-Level, …) when browsing and
// as one de-duplicated list when searching. Either way a selection submits the
// plain subject name, so the payload is identical to a flat list.
const SUBJECT_GROUPS = Object.entries(SUBJECT_OPTIONS);
const UNIQUE_SUBJECTS = [...new Set(Object.values(SUBJECT_OPTIONS).flat())].sort();

// Shared input styling, kept identical to the signup form at /become-a-mentor so
// the two halves of the application read as one flow.
const CARD = 'rounded-[24px] border border-gray-100 bg-white shadow-lg shadow-gray-100/50'

const INPUT_BASE = 'w-full rounded-xl border bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:ring-2'
const INPUT_IDLE = 'border-gray-200 focus:border-accent focus:ring-accent/20'
const INPUT_ERROR = 'border-red-300 focus:border-red-400 focus:ring-red-100'

const SECTION_LAYOUT = [
    {
        id: 'about',
        icon: UserRound,
        title: 'About you',
        description: 'How we introduce you to students, and how we reach you.',
        questionIds: ['bio', 'phone_number'],
    },
    {
        id: 'expertise',
        icon: GraduationCap,
        title: 'Your expertise',
        description: 'What you can mentor on, and how much mentoring you have done.',
        questionIds: ['expertise', 'years_experience'],
    },
    {
        id: 'documents',
        icon: Paperclip,
        title: 'Links and documents',
        description: 'Supporting material our review team looks at.',
        questionIds: ['linkedin_url', 'photo', 'cv'],
    },
]

// The config file stays the source of truth. Anything it adds that the layout
// above does not mention still renders, in the last section.
const SECTIONS = (() => {
    const claimed = new Set(SECTION_LAYOUT.flatMap(s => s.questionIds))
    const unclaimed = MENTOR_ONBOARDING_QUESTIONS.filter(q => !claimed.has(q.id))
    return SECTION_LAYOUT
        .map((section, index) => ({
            ...section,
            questions: [
                ...section.questionIds
                    .map(id => MENTOR_ONBOARDING_QUESTIONS.find(q => q.id === id))
                    .filter((q): q is OnboardingQuestion => Boolean(q)),
                ...(index === SECTION_LAYOUT.length - 1 ? unclaimed : []),
            ],
        }))
        .filter(section => section.questions.length > 0)
})()

const CHECKLIST_LABELS: Record<string, string> = {
    bio: 'Short bio',
    phone_number: 'Phone number',
    expertise: 'Areas of expertise',
    years_experience: 'Mentoring experience',
    photo: 'Profile photo',
    cv: 'CV / resume',
}

const REQUIRED_QUESTIONS = MENTOR_ONBOARDING_QUESTIONS.filter(q => q.required)

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function OnboardingForm({ firstName }: { firstName?: string }) {
  const [state, formAction] = useActionState(submitOnboarding, null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customExpertise, setCustomExpertise] = useState('');
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);
  const [selectValues, setSelectValues] = useState<Record<string, string>>({});
  // Mirrored so the checklist and progress bar reflect what is actually filled in.
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, { name: string; size: number }>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const customSelectRef = useRef<HTMLDivElement>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  // Release the object URL behind the photo thumbnail when it is replaced.
  useEffect(() => {
    if (!photoPreview) return
    return () => URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

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

  const clearFile = (questionId: string) => {
    const input = fileInputRefs.current[questionId]
    if (input) input.value = ''
    setSelectedFiles(prev => {
      const next = { ...prev }
      delete next[questionId]
      return next
    })
    setFileErrors(prev => ({ ...prev, [questionId]: '' }))
    if (questionId === 'photo') setPhotoPreview(null)
  }

  const validateFileSize =
    (questionId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];

      // Clear any previous error when user clears selection
      if (!file) {
        setFileErrors(prev => ({ ...prev, [questionId]: '' }));
        setSelectedFiles(prev => {
          const next = { ...prev }
          delete next[questionId]
          return next
        });
        if (questionId === 'photo') setPhotoPreview(null);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileErrors(prev => ({
          ...prev,
          [questionId]: `Max file size is ${MAX_FILE_SIZE_MB}MB.`,
        }));
        // Clear the input so the form can't submit the oversized file
        e.target.value = '';
        setSelectedFiles(prev => {
          const next = { ...prev }
          delete next[questionId]
          return next
        });
        if (questionId === 'photo') setPhotoPreview(null);
        return;
      }

      setFileErrors(prev => ({ ...prev, [questionId]: '' }));
      setSelectedFiles(prev => ({ ...prev, [questionId]: { name: file.name, size: file.size } }));
      if (questionId === 'photo') {
        setPhotoPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
      }
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

  // A required question counts as done only when it would actually pass
  // validation, so the bar can genuinely reach 100%.
  const isQuestionComplete = (question: OnboardingQuestion) => {
    switch (question.type) {
      case 'phone':
        return phoneDigits.length >= 6 && phoneDigits.length <= 10
      case 'multiselect':
        return selectedSubjects.length > 0 &&
          (!selectedSubjects.includes('Other') || customExpertise.trim().length > 0)
      case 'select':
        return Boolean(selectValues[question.id])
      case 'file':
        return Boolean(selectedFiles[question.id]) && !fileErrors[question.id]
      default:
        return Boolean(textValues[question.id]?.trim())
    }
  }

  const completedCount = REQUIRED_QUESTIONS.filter(isQuestionComplete).length
  const completionPct = REQUIRED_QUESTIONS.length
    ? Math.round((completedCount / REQUIRED_QUESTIONS.length) * 100)
    : 0
  const welcomeName = firstName ? `, ${firstName}` : ''

  const renderQuestion = (question: OnboardingQuestion) => (
    <div key={question.id} className="group">
      <label
        htmlFor={question.id}
        className="mb-2 block text-sm font-semibold text-gray-700"
      >
        {question.label}{' '}
        {question.required
          ? <span className="text-red-500">*</span>
          : <span className="font-normal text-gray-400">(optional)</span>}
      </label>

      {question.type === 'phone' && (
        <div className="space-y-1.5">
          {/* Hidden input carries the full number to Supabase */}
          <input type="hidden" name="phone_number" value={`${selectedCountry.dialCode}${phoneDigits}`} />
          <div className={`flex items-stretch rounded-xl border bg-gray-50 transition-all duration-200 focus-within:ring-2 ${
            fieldErrors.phone_number
              ? 'border-red-300 focus-within:ring-red-100'
              : 'border-gray-200 focus-within:border-accent focus-within:ring-accent/20'
          }`}>
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
                className="flex h-full items-center gap-2 rounded-l-xl px-3.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`} alt={selectedCountry.name} width={20} height={14} className="rounded-[2px] object-cover" />
                <span>{selectedCountry.dialCode}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Country dropdown */}
              {isCountryDropdownOpen && (
                <div className="absolute left-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  <div className="border-b border-gray-100 p-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
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
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto p-1">
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
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                          country.code === selectedCountry.code ? 'bg-accent/5 font-medium text-accent' : 'text-gray-700'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`} alt={country.name} width={20} height={14} className="shrink-0 rounded-[2px] object-cover" />
                        <span className="flex-1 truncate">{country.name}</span>
                        <span className="shrink-0 text-xs text-gray-400">{country.dialCode}</span>
                      </button>
                    ))}
                    {filteredCountries.length === 0 && (
                      <div className="px-3 py-6 text-center text-sm text-gray-400">No country found</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <span className="my-2.5 w-px shrink-0 bg-gray-200" />

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
              className="w-full flex-1 rounded-r-xl bg-transparent px-3.5 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
          {fieldErrors.phone_number && (
            <p className="text-xs font-medium text-red-500">{fieldErrors.phone_number}</p>
          )}
        </div>
      )}

      {question.type === 'text' && (
        <div className="space-y-1.5">
          <input
            type="text"
            id={question.id}
            name={question.id}
            required={question.required}
            placeholder={question.placeholder}
            value={textValues[question.id] ?? ''}
            onChange={(e) => {
              setTextValues(prev => ({ ...prev, [question.id]: e.target.value }))
              if (fieldErrors[question.id]) {
                setFieldErrors(prev => ({ ...prev, [question.id]: '' }))
              }
            }}
            aria-invalid={Boolean(fieldErrors[question.id])}
            className={`${INPUT_BASE} ${fieldErrors[question.id] ? INPUT_ERROR : INPUT_IDLE}`}
          />
          {fieldErrors[question.id] && (
            <p className="text-xs font-medium text-red-500">{fieldErrors[question.id]}</p>
          )}
        </div>
      )}

      {question.type === 'textarea' && (
        <textarea
          id={question.id}
          name={question.id}
          required={question.required}
          placeholder={question.placeholder}
          rows={5}
          value={textValues[question.id] ?? ''}
          onChange={(e) => setTextValues(prev => ({ ...prev, [question.id]: e.target.value }))}
          className={`${INPUT_BASE} ${INPUT_IDLE} min-h-[140px] resize-y leading-relaxed`}
        />
      )}

      {question.type === 'file' && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            {/* The input sits transparently over the tile rather than being
                hidden, so `required` can still focus it during validation. */}
            <div className="relative flex-1">
              <input
                type="file"
                id={question.id}
                name={question.id}
                ref={el => { fileInputRefs.current[question.id] = el }}
                required={question.required}
                accept={question.id === 'photo' ? PHOTO_ACCEPT_ATTR : '.pdf,.doc,.docx'}
                onChange={validateFileSize(question.id)}
                aria-invalid={Boolean(fileErrors[question.id])}
                aria-describedby={`${question.id}-help ${question.id}-error`}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <div className={`pointer-events-none flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                fileErrors[question.id]
                  ? 'border-red-300 bg-red-50'
                  : selectedFiles[question.id]
                    ? 'border-gray-200 bg-white'
                    : 'border-dashed border-gray-300 bg-gray-50'
              }`}>
                {photoPreview && question.id === 'photo' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    selectedFiles[question.id] ? 'bg-accent/10 text-accent' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {selectedFiles[question.id]
                      ? <FileText className="h-4 w-4" />
                      : <Upload className="h-4 w-4" />}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  {selectedFiles[question.id] ? (
                    <>
                      <span className="block truncate text-sm font-medium text-gray-900">
                        {selectedFiles[question.id].name}
                      </span>
                      <span className="block text-xs text-gray-400">
                        {formatFileSize(selectedFiles[question.id].size)} · Click to replace
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="block text-sm font-medium text-gray-700">
                        Click to upload
                      </span>
                      <span id={`${question.id}-help`} className="block text-xs text-gray-400">
                        {question.id === 'photo' ? 'JPEG, PNG, WebP or GIF' : 'PDF, DOC or DOCX'} · up to {MAX_FILE_SIZE_MB}MB
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>
            {selectedFiles[question.id] && (
              <button
                type="button"
                onClick={() => clearFile(question.id)}
                aria-label={`Remove ${question.label}`}
                className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {fileErrors[question.id] && (
            <p id={`${question.id}-error`} className="text-xs font-medium text-red-500">
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
            className={`flex w-full items-center justify-between rounded-xl border bg-gray-50 px-4 py-3 text-left transition-all duration-200 hover:border-gray-300 ${
              openSelectId === question.id ? 'border-accent ring-2 ring-accent/20' : 'border-gray-200'
            }`}
          >
            <span className={selectValues[question.id] ? 'text-gray-900' : 'text-gray-400'}>
              {selectValues[question.id] ?? 'Select an option'}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${openSelectId === question.id ? 'rotate-180' : ''}`} />
          </button>
          {openSelectId === question.id && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
              {question.options?.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setSelectValues(prev => ({ ...prev, [question.id]: option }))
                    setOpenSelectId(null)
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${
                    selectValues[question.id] === option ? 'bg-accent/5 font-medium text-accent' : 'text-gray-700'
                  }`}
                >
                  {option}
                  {selectValues[question.id] === option && <Check className="h-4 w-4" />}
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

          {/* Dropdown trigger */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex w-full items-center justify-between rounded-xl border bg-gray-50 px-4 py-3 text-left transition-all duration-200 hover:border-gray-300 ${
              isDropdownOpen ? 'border-accent ring-2 ring-accent/20' : 'border-gray-200'
            }`}
          >
            <span className={selectedSubjects.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
              {selectedSubjects.length === 0
                ? 'Search or browse subjects…'
                : `${selectedSubjects.length} subject${selectedSubjects.length > 1 ? 's' : ''} selected`}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Selected tags */}
          {selectedSubjects.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedSubjects.map((subject) => (
                <span
                  key={subject}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 py-1 pl-3 pr-1.5 text-xs font-medium text-accent"
                >
                  <span className="max-w-[180px] truncate">{subject}</span>
                  <button
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    aria-label={`Remove ${subject}`}
                    className="rounded-full p-0.5 transition-colors hover:bg-accent/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Dropdown menu */}
          {isDropdownOpen && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              {/* Search */}
              <div className="border-b border-gray-100 p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search subjects…"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Options list */}
              <div className="max-h-64 overflow-y-auto p-1">
                {searchQuery.trim() ? (
                  <>
                    {filteredSubjects.map((subject) => (
                      <SubjectOption
                        key={subject}
                        subject={subject}
                        selected={selectedSubjects.includes(subject)}
                        onToggle={toggleSubject}
                      />
                    ))}
                    {filteredSubjects.length === 0 && (
                      <div className="px-3 py-6 text-center text-sm text-gray-400">
                        No subjects found
                      </div>
                    )}
                  </>
                ) : (
                  SUBJECT_GROUPS.map(([groupName, subjects]) => (
                    <div key={groupName} className="mb-1 last:mb-0">
                      <p className="sticky top-0 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        {groupName}
                      </p>
                      {subjects.map((subject) => (
                        <SubjectOption
                          key={`${groupName}-${subject}`}
                          subject={subject}
                          selected={selectedSubjects.includes(subject)}
                          onToggle={toggleSubject}
                        />
                      ))}
                    </div>
                  ))
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
          <label htmlFor="custom-expertise" className="mb-2 block text-sm font-semibold text-gray-700">
            Please specify your expertise <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="custom-expertise"
            value={customExpertise}
            onChange={(e) => setCustomExpertise(e.target.value)}
            required
            placeholder="e.g. Underwater Basket Weaving"
            className={`${INPUT_BASE} ${INPUT_IDLE}`}
          />
        </motion.div>
      )}
    </div>
  )

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#F9FAFB] text-gray-900">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className={`mb-8 flex items-center justify-between gap-3 px-4 py-3 sm:px-5 ${CARD}`}>
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Access Oxbridge"
              width={36}
              height={36}
              className="shrink-0 rounded-xl"
            />
            <span className="text-lg font-extrabold tracking-tight text-accent sm:text-xl">
              Access Oxbridge
            </span>
          </div>
          <LogoutButton className="shrink-0 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-gray-600 hover:text-accent" />
        </div>

        <header className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent/60">
            Mentor application
          </p>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-accent sm:text-4xl">
            Complete your profile{welcomeName}
          </h1>
          <p className="max-w-2xl leading-relaxed text-gray-500">
            Share your expertise, experience, and supporting documents. This helps us review your application faster and place you with the right students.
          </p>
        </header>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form
            action={formAction}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {state?.error && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                {state.error}
              </div>
            )}

            {SECTIONS.map((section) => (
              <section key={section.id} className={`p-6 sm:p-8 ${CARD}`}>
                <div className="mb-6 flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rich-beige-accent text-accent shadow-inner">
                    <section.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-accent">{section.title}</h2>
                    <p className="mt-1 text-sm text-gray-500">{section.description}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  {section.questions.map(renderQuestion)}
                </div>
              </section>
            ))}

            <div className={`p-6 sm:p-8 ${CARD}`}>
              <SubmitButton hasFileErrors={hasFileErrors} />
              <p className="mt-4 text-center text-xs text-gray-400">
                By submitting, you agree to our{' '}
                <a href="https://www.accessoxbridge.io/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Terms of Service</a>
                {' '}and{' '}
                <a href="https://www.accessoxbridge.io/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Privacy Policy</a>.
              </p>
            </div>
          </form>

          <aside className="space-y-5 lg:sticky lg:top-8">
            <div className={`p-5 ${CARD}`}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-accent">Your progress</h2>
                <span className="text-xs font-semibold text-accent">
                  {completedCount} of {REQUIRED_QUESTIONS.length}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${completionPct}%` }}
                />
              </div>

              <ul className="mt-4 space-y-2.5">
                {REQUIRED_QUESTIONS.map((question) => {
                  const done = isQuestionComplete(question)
                  return (
                    <li key={question.id} className="flex items-center gap-2.5 text-sm">
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        done ? 'bg-accent text-white' : 'border border-gray-300'
                      }`}>
                        {done && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <span className={done ? 'text-gray-400 line-through' : 'text-gray-600'}>
                        {CHECKLIST_LABELS[question.id] ?? question.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="rounded-[24px] bg-rich-beige-accent p-5">
              <h3 className="mb-4 text-sm font-bold text-accent">What happens next</h3>
              <ol className="space-y-4">
                {[
                  { title: 'You submit', detail: 'Takes about 10 minutes.' },
                  { title: 'We review', detail: 'Usually within 24 to 48 hours.' },
                  { title: 'We email you', detail: 'With the outcome and your next step.' },
                ].map((step, index, steps) => (
                  <li key={step.title} className="relative flex gap-3">
                    {index < steps.length - 1 && (
                      <span className="absolute left-[5px] top-4 h-full w-px bg-accent/15" />
                    )}
                    <span className={`relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      index === 0 ? 'bg-accent' : 'bg-accent/25'
                    }`} />
                    <span>
                      <span className="block text-sm font-medium text-accent">{step.title}</span>
                      <span className="block text-xs text-accent/60">{step.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function SubjectOption({
  subject,
  selected,
  onToggle,
}: {
  subject: string
  selected: boolean
  onToggle: (subject: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(subject)}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
        selected ? 'font-medium text-accent' : 'text-gray-700'
      }`}
    >
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
        selected ? 'border-accent bg-accent text-white' : 'border-gray-300'
      }`}>
        {selected && <Check className="h-3 w-3" />}
      </span>
      {subject}
    </button>
  )
}

function SubmitButton({ hasFileErrors }: { hasFileErrors: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || hasFileErrors}
      className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-base font-bold text-white shadow-lg transition-all duration-300 active:scale-[0.98] ${
        pending || hasFileErrors
          ? 'cursor-not-allowed bg-gray-300 shadow-none'
          : 'bg-accent hover:bg-[#07214d] hover:shadow-accent/40'
      }`}
    >
      {pending ? (
        <>
          <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Submitting application...
        </>
      ) : (
        'Submit application'
      )}
    </button>
  )
}
