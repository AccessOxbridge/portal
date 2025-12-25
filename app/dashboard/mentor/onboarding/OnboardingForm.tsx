"use client"

import { motion } from "framer-motion";
import { MENTOR_ONBOARDING_QUESTIONS } from '@/config/mentor-onboarding.config'
import { submitOnboarding } from './actions'
import { Logo } from "@/components/logo";

export default function OnboardingForm() {
  return (
    <div className="min-h-screen bg-accent text-white">
      <div className="max-w-7xl mx-auto px-8 lg:px-12 ">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
          {/* Left Side: Header & Form */}
          <div className="space-y-16 mt-12">
            <div className="space-y-8">
              <Logo className="justify-start"/>
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
                    <input
                      type="file"
                      id={question.id}
                      name={question.id}
                      required={question.required}
                      accept={question.id === 'photo' ? 'image/*' : '.pdf,.doc,.docx'}
                      className="w-full bg-transparent border-b border-gray-700 py-2 focus:outline-none focus:border-white transition-all duration-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600"
                    />
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
                    <div className="space-y-3 mt-3">
                      {question.options?.map((option) => (
                        <label key={option} className="flex items-center cursor-pointer group">
                          <input
                            type="checkbox"
                            name={question.id}
                            value={option}
                            className="h-4 w-4 text-white border-gray-700 rounded focus:ring-white bg-transparent"
                          />
                          <span className="ml-3 text-sm text-gray-300 group-hover:text-white transition-colors">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <button
                type="submit"
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
