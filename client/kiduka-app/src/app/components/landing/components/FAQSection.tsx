"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How accurate is the ML Predictive Engine?",
    answer:
      "Our ML engine uses high-resolution satellite data from the Google Earth Engine (Sentinel-1 and MODIS). It achieves over 95% accuracy in estimating Soil Health Index (SHI) by analyzing vegetation trends, soil texture, and surface roughness.",
  },
  {
    question: "What is Hybrid Prediction Mode?",
    answer:
      "Hybrid mode activates when you provide some lab results but not all. The system uses AI to 'gap-fill' missing nutrients while ensuring your actual lab measurements always override predicted values for total precision.",
  },
  {
    question: "What information do I need to get started?",
    answer:
      "The minimum requirement is your GPS location and soil pH level. This transitions the system to ML mode. For higher precision, you can optionally provide N, P, K, Organic Carbon, Calcium, and Magnesium levels.",
  },
  {
    question: "How does the Agrovet recommendation work?",
    answer:
      "We use the Haversine formula to calculate your distance to local agrovets. We then match your specific nutrient deficiencies (e.g., Nitrogen) with the correct products (e.g., CAN) available at those coordinates.",
  },
  {
    question: "Can I track multiple farms?",
    answer:
      "Absolutely. Kiduka allows you to manage multiple geographical coordinates and track the historical soil health trends for each field independently.",
  },
  {
    question: "What are the scientific rules for SHI Calculation?",
    answer:
      "Our expert system uses Diagnostic Engine rules — such as the 'pH Cap' where a very poor pH restricts the overall health status, or the 'OC Downgrade' based on Organic Carbon levels.",
  },
];

export function FAQSection() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">
            FAQ
          </span>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-green-900 mb-4">
            Frequently Asked Questions
          </h3>
          <p className="text-gray-500">
            Everything you need to know about Kiduka
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-2xl border border-amber-200 bg-white overflow-hidden"
            >
              <button
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-amber-50/50 transition-colors text-left gap-4"
              >
                <h4 className="text-sm font-semibold text-green-900 leading-snug">
                  {faq.question}
                </h4>
                <ChevronDown
                  className={`flex-shrink-0 h-5 w-5 text-amber-500 transition-transform duration-300 ${
                    openFAQ === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openFAQ === index && (
                <div className="px-6 pb-5 border-t border-amber-100">
                  <p className="text-gray-600 text-sm leading-relaxed pt-4">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
