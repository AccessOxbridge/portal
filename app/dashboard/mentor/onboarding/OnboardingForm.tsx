"use client"

import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { MENTOR_ONBOARDING_QUESTIONS, SUBJECT_OPTIONS } from '@/config/mentor-onboarding.config'
import { submitOnboarding } from './actions'
import { Logo } from "@/components/logo";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Flatten all subjects into a single array
const ALL_SUBJECTS = Object.values(SUBJECT_OPTIONS).flat();
// Remove duplicates
const UNIQUE_SUBJECTS = [...new Set(ALL_SUBJECTS)].sort();

export default function OnboardingForm() {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
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
    if (!hasFileErrors) return;
    e.preventDefault();

    const firstErrorField = Object.entries(fileErrors).find(([, msg]) => Boolean(msg))?.[0];
    if (firstErrorField) {
      const el = document.getElementById(firstErrorField) as HTMLInputElement | null;
      el?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-accent text-white">
      <div className="max-w-7xl mx-auto px-8 lg:px-12 ">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
          {/* Left Side: Header & Form */}
          <div className="space-y-16 mt-12">
            <div className="space-y-8">
              <Logo className="justify-start" />
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
              action={submitOnboarding}
              onSubmit={handleSubmit}
              className="space-y-8 max-w-md"
            >
              {MENTOR_ONBOARDING_QUESTIONS.map((question) => (
                <div key={question.id} className="group">
                  <label htmlFor={question.id} className="block text-sm text-gray-400 mb-1 group-focus-within:text-white transition-colors">
                    {question.label} {question.required && <span className="text-red-500">*</span>}
                  </label>

                  {question.type === 'text' && (
                    <input
                      type="text"
                      id={question.id}
                      name={question.id}
                      required={question.required}
                      placeholder={question.placeholder}
                      className="w-full bg-transparent border-b border-gray-700 py-2 focus:outline-none focus:border-white transition-all duration-300"
                    />
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
                        accept={question.id === 'photo' ? 'image/*' : '.pdf,.doc,.docx'}
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
                    <select
                      id={question.id}
                      name={question.id}
                      required={question.required}
                      className="w-full bg-transparent border-b border-gray-700 py-2 focus:outline-none focus:border-white transition-all duration-300 text-white"
                    >
                      <option value="" className="bg-gray-800">Select an option</option>
                      {question.options?.map((option) => (
                        <option key={option} value={option} className="bg-gray-800">
                          {option}
                        </option>
                      ))}
                    </select>
                  )}

                  {question.type === 'multiselect' && (
                    <div ref={dropdownRef} className="relative">
                      {/* Hidden inputs for form submission */}
                      {selectedSubjects.map((subject) => (
                        <input key={subject} type="hidden" name={question.id} value={subject} />
                      ))}

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
                </div>
              ))}

              <button
                type="submit"
                disabled={hasFileErrors}
                className="w-full bg-[#4a4a4a] hover:bg-[#5a5a5a] text-white py-4 transition-all duration-300 font-medium tracking-widest text-sm uppercase mt-8"
              >
                Submit Application
              </button>

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
