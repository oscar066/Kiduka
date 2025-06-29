// components/soil-analysis/ComprehensiveAnalysis.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Beaker,
  Target,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Settings,
} from "lucide-react";
import { StructuredResponse } from "@/types/soil-analysis";

interface ComprehensiveAnalysisProps {
  structuredResponse: StructuredResponse;
}

export function ComprehensiveAnalysis({
  structuredResponse,
}: ComprehensiveAnalysisProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechVoice, setSpeechVoice] = useState<SpeechSynthesisVoice | null>(
    null
  );
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [showSettings, setShowSettings] = useState(false);

  // Check for speech synthesis support
  const isSpeechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // Load available voices
  useEffect(() => {
    if (!isSpeechSupported) return;

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      setAvailableVoices(voices);

      // Set default voice (prefer English voices)
      const englishVoice =
        voices.find(
          (voice) => voice.lang.startsWith("en") && voice.localService
        ) ||
        voices.find((voice) => voice.lang.startsWith("en")) ||
        voices[0];

      setSpeechVoice(englishVoice);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, [isSpeechSupported]);

  // Create comprehensive text for TTS
  const createFullAnalysisText = () => {
    const sections = [
      `Executive Summary: ${structuredResponse.explanation.summary}`,
      `Soil Fertility Analysis: ${structuredResponse.explanation.fertility_analysis}`,
      `pH Analysis: ${structuredResponse.explanation.ph_analysis}`,
      `Nutrient Analysis: ${structuredResponse.explanation.nutrient_analysis}`,
      `Soil Texture Analysis: ${structuredResponse.explanation.soil_texture_analysis}`,
      `Overall Assessment: ${structuredResponse.explanation.overall_assessment}`,
    ];

    return sections.join(". ");
  };

  const speakText = (text: string, sectionName?: string) => {
    if (!isSpeechSupported) {
      alert("Text-to-speech is not supported in your browser.");
      return;
    }

    // Stop any current speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Configure speech parameters
    utterance.rate = speechRate;
    utterance.pitch = 1;
    utterance.volume = 1;

    if (speechVoice) {
      utterance.voice = speechVoice;
    }

    // Event handlers
    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      if (sectionName) setCurrentSection(sectionName);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSection(null);
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event.error);
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSection(null);
    };

    speechSynthesis.speak(utterance);
  };

  const togglePlayPause = () => {
    if (!isSpeechSupported) return;

    if (isPlaying && !isPaused) {
      speechSynthesis.pause();
      setIsPaused(true);
    } else if (isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
    } else {
      speakText(createFullAnalysisText(), "Complete Analysis");
    }
  };

  const stopSpeech = () => {
    if (!isSpeechSupported) return;
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSection(null);
  };

  const speakSection = (text: string, sectionName: string) => {
    speakText(text, sectionName);
  };

  const analysisData = [
    {
      id: "summary",
      title: "Executive Summary",
      content: structuredResponse.explanation.summary,
      icon: <Beaker className="h-4 w-4" />,
      bgColor: "bg-gradient-to-r from-blue-50 to-green-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
      titleColor: "text-blue-900",
    },
    {
      id: "fertility",
      title: "Fertility Analysis",
      content: structuredResponse.explanation.fertility_analysis,
      icon: <Target className="h-4 w-4" />,
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      textColor: "text-amber-800",
      titleColor: "text-amber-900",
    },
    {
      id: "ph",
      title: "pH Analysis",
      content: structuredResponse.explanation.ph_analysis,
      icon: <Target className="h-4 w-4" />,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-800",
      titleColor: "text-green-900",
    },
    {
      id: "nutrients",
      title: "Nutrient Analysis",
      content: structuredResponse.explanation.nutrient_analysis,
      icon: <Target className="h-4 w-4" />,
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-800",
      titleColor: "text-purple-900",
    },
    {
      id: "texture",
      title: "Soil Texture Analysis",
      content: structuredResponse.explanation.soil_texture_analysis,
      icon: <Target className="h-4 w-4" />,
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-800",
      titleColor: "text-yellow-900",
    },
    {
      id: "overall",
      title: "Overall Assessment",
      content: structuredResponse.explanation.overall_assessment,
      icon: <Target className="h-4 w-4" />,
      bgColor: "bg-gradient-to-r from-slate-50 to-gray-50",
      borderColor: "border-slate-200",
      textColor: "text-slate-800",
      titleColor: "text-slate-900",
    },
  ];

  return (
    <Card className="border-amber-200 bg-white shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
        <CardTitle className="flex items-center justify-between text-green-800">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Comprehensive Analysis
          </div>

          {/* TTS Controls */}
          {isSpeechSupported && (
            <div className="flex items-center gap-2">
              {currentSection && (
                <Badge variant="secondary" className="text-xs">
                  Playing: {currentSection}
                </Badge>
              )}

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePlayPause}
                  className="border-green-200 text-green-700 hover:bg-green-50"
                >
                  {isPlaying && !isPaused ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopSpeech}
                  disabled={!isPlaying && !isPaused}
                  className="border-green-200 text-green-700 hover:bg-green-50"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="border-green-200 text-green-700 hover:bg-green-50"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardTitle>

        {/* TTS Settings Panel */}
        {showSettings && isSpeechSupported && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-green-200 space-y-3">
            <h5 className="font-medium text-green-800 text-sm">
              Speech Settings
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-700">
                  Speech Rate: {speechRate}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {availableVoices.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-green-700">
                    Voice
                  </label>
                  <select
                    value={speechVoice?.name || ""}
                    onChange={(e) => {
                      const voice = availableVoices.find(
                        (v) => v.name === e.target.value
                      );
                      setSpeechVoice(voice || null);
                    }}
                    className="w-full p-2 text-sm border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {availableVoices.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {analysisData.map((section, index) => (
          <div
            key={section.id}
            className={`${section.bgColor} p-4 rounded-lg border ${
              section.borderColor
            } ${
              currentSection === section.title ? "ring-2 ring-green-400" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4
                className={`${section.titleColor} font-semibold flex items-center gap-2`}
              >
                {section.icon}
                {section.title}
              </h4>

              {isSpeechSupported && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => speakSection(section.content, section.title)}
                  className="text-gray-500 hover:text-green-600 p-1"
                  title={`Listen to ${section.title}`}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className={`${section.textColor} text-sm leading-relaxed`}>
              {section.content}
            </p>
          </div>
        ))}

        {!isSpeechSupported && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <VolumeX className="h-4 w-4" />
              <span className="text-sm font-medium">
                Text-to-speech is not supported in your browser. Please use a
                modern browser for audio features.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
