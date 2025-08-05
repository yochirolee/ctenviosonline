'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type FAQ = {
  q: string
  a: string
}

type FaqDict = {
  label: string
  title1: string
  title2: string
  questions: FAQ[]
}

type Dict = {
  faq: FaqDict
}

type Props = {
  dict: Dict
}

export default function FAQSection({ dict }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setActiveIndex(index === activeIndex ? null : index)
  }

  const faqs = dict.faq.questions

  return (
    <section id="faq" className="relative isolate overflow-visible bg-green-50 py-24 px-6 font-sans">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12">
        <div className="flex flex-col text-left basis-1/2">
          <p className="inline-block font-semibold text-gray-800 mb-4">{dict.faq.label}</p>
          <h2 className="sm:text-4xl text-3xl font-extrabold text-gray-900">
            {dict.faq.title1} <span className="text-green-600">{dict.faq.title2}</span>
          </h2>
        </div>

        <ul className="basis-1/2">
          {faqs.map((faq, index) => (
            <li key={index} className="group border-t border-green-300">
              <button
                onClick={() => toggleFAQ(index)}
                className="relative flex gap-2 items-center w-full py-5 text-base font-semibold text-left text-gray-900 md:text-lg"
                aria-expanded={activeIndex === index}
              >
                <span className="flex-1">{faq.q}</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${
                    activeIndex === index ? 'rotate-45' : ''
                  }`}
                  viewBox="0 0 16 16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect y="7" width="16" height="2" rx="1" fill="currentColor" />
                  <rect
                    y="7"
                    width="16"
                    height="2"
                    rx="1"
                    fill="currentColor"
                    className={`transition-opacity duration-200 ${
                      activeIndex === index ? 'opacity-0' : 'opacity-100'
                    } rotate-90`}
                  />
                </svg>
              </button>

              <AnimatePresence initial={false}>
                {activeIndex === index && (
                  <motion.div
                    key="content"
                    initial="collapsed"
                    animate="open"
                    exit="collapsed"
                    variants={{
                      open: { opacity: 1, height: 'auto' },
                      collapsed: { opacity: 0, height: 0 },
                    }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pb-5 leading-relaxed text-gray-800">{faq.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
