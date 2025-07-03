// PronunciationFeedback.jsx – DizAí v1.5.4 full feedback UI with strict KRAV integration
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const getColor = (severity) => {
  if (severity === "minor") return "text-orange-600";
  if (severity === "major") return "text-red-600";
  return "text-foreground";
};

export default function PronunciationFeedback({ native, attempt, deviations }) {
  const hasDeviations = deviations && deviations.length > 0;
  const attemptValid = attempt && attempt.trim().length > 0;

  // Map words to their deviations
  const wordMap = {};
  deviations.forEach(({ word, severity, note }, i) => {
    const key = word?.toLowerCase?.() || `__missing${i}`;
    if (!wordMap[key]) wordMap[key] = [];
    wordMap[key].push({ severity, note, index: i + 1 });
  });

  // Render attempt with superscripts and coloring
  const attemptWords = attemptValid
    ? attempt.split(" ").map((word, idx) => {
        const clean = word.toLowerCase().replace(/[.,!?]/g, "");
        const match = wordMap[clean];
        if (!match) {
          return <span key={idx} className="mr-1">{word}</span>;
        }

        const highest = match.sort((a, b) => (a.severity === "major" ? -1 : 1))[0];
        return (
          <span
            key={idx}
            className={cn(getColor(highest.severity), "mr-1 font-semibold")}
          >
            {word}
            <sup className="ml-0.5 text-xs">{highest.index}</sup>
          </span>
        );
      })
    : [
        <span key="na" className="text-red-600">
          (No recognizable attempt)
        </span>,
      ];

  return (
    <Card className="w-full p-4 md:p-6 text-sm md:text-base">
      <CardContent className="space-y-3">
        {/* Native reference */}
        <div className="text-muted-foreground text-xs md:text-sm">
          Native phrase:
        </div>
        <div className="font-medium text-gray-900 leading-relaxed">
          {native}
        </div>

        {/* User attempt */}
        <div className="text-muted-foreground text-xs md:text-sm">
          Your attempt:
        </div>
        <div className="font-medium flex flex-wrap gap-y-1 leading-relaxed">
          {attemptWords}
        </div>

        {/* Deviations */}
        {hasDeviations ? (
          <div className="mt-3 space-y-2">
            {deviations.map((dev, idx) => (
              <div
                key={idx}
                className={cn("text-xs leading-snug", getColor(dev.severity))}
              >
                <sup className="font-bold mr-1">{idx + 1}</sup>
                <strong>{dev.word || "[missing word]"}:</strong> {dev.note}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-green-700 font-medium">
            ✔️ Perfect pronunciation! Great job maintaining correct phonemes and rhythm.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
