"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Volume2,
  Pause,
  Play,
  RotateCcw,
  Settings,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  VolumeX,
} from "lucide-react";
import { PredictionResponse, SoilInput } from "@/types/soil-analysis";

interface ComprehensiveAnalysisProps {
  results: PredictionResponse;
  soilInput: SoilInput;
}

export function ComprehensiveAnalysis({
  results,
  soilInput,
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
    const parts = [
      `Soil Health Index: ${results.soil_health_index.toFixed(2)} out of 4.`,
      `Initial classification: ${results.initial_soil_fertility_status}.`,
      `Final soil status: ${results.soil_fertility_status}.`,
    ];

    if (results.mentions.length > 0) {
      parts.push(`Override rules triggered: ${results.mentions.join(". ")}.`);
    }

    if (results.recommendations.length > 0) {
      parts.push(`Recommendations: ${results.recommendations.join(". ")}.`);
    }

    return parts.join(" ");
  };

  const speakText = (text: string, sectionName?: string) => {
    if (!isSpeechSupported) return;

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = 1;
    utterance.volume = 1;

    if (speechVoice) {
      utterance.voice = speechVoice;
    }

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

    utterance.onerror = () => {
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

  const wasDowngraded = results.initial_soil_fertility_status !== results.soil_fertility_status;

  return (
    <Card className="border-amber-200 bg-white shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-amber-50 border-b border-amber-200">
        <CardTitle className="flex items-center justify-between text-green-800">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Classification Details
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
        {/* Classification Flow */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
          <h4 className="text-blue-900 font-semibold mb-3 text-sm">Classification Flow</h4>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-sm px-3 py-1">
              {results.initial_soil_fertility_status}
            </Badge>
            {wasDowngraded ? (
              <>
                <ArrowRight className="h-4 w-4 text-amber-600" />
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-sm px-3 py-1">
                  {results.soil_fertility_status}
                </Badge>
                <span className="text-xs text-amber-600 italic">(adjusted by override rules)</span>
              </>
            ) : (
              <span className="text-xs text-green-600 italic">No overrides applied</span>
            )}
          </div>
        </div>

        {/* Triggered Override Rules */}
        {results.mentions.length > 0 && (
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="text-amber-900 font-semibold mb-3 flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Override Rules Triggered
            </h4>
            <div className="space-y-2">
              {results.mentions.map((mention, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-200"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-800 font-medium">{mention}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHI Score breakdown */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="text-green-900 font-semibold mb-3 flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4" />
            Soil Health Index Details
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">{results.soil_health_index.toFixed(2)}</p>
              <p className="text-xs text-gray-600">SHI Score</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">{soilInput.ph.toFixed(1)}</p>
              <p className="text-xs text-gray-600">pH Level</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">{soilInput.organic_carbon !== undefined ? soilInput.organic_carbon.toFixed(1) : "N/A"}%</p>
              <p className="text-xs text-gray-600">Organic Carbon</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">{results.recommendations.length}</p>
              <p className="text-xs text-gray-600">Actions Needed</p>
            </div>
          </div>
        </div>

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
