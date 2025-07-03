// PronunciationFeedback.jsx – DizAí v1.5 feedback component with full KRAV PÅ FEEDBACK compliance

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const getColor = (severity) => {
  if (severity === "minor") return "text-orange-600";
  if (severity === "major") return "text-red-600";
  return "text-green-700";
};

export default function PronunciationFeedback({ native, attempt, deviations }) {
  const hasDeviations = deviations && deviations.length > 0;

  const attemptWords = attempt.split(" ");
  const indexedDeviations = deviations.map((dev, i) => ({ ...dev, index: i + 1 }));

  const colorMap = {};
  const markMap = {};

  indexedDeviations.forEach(({ word, severity, index }) => {
    colorMap[word.toLowerCase()] = severity;
    markMap[word.toLowerCase()] = index;
  });

  return (
    <Card className="w-full p-4 md:p-6 text-sm md:text-base">
      <CardContent className="space-y-4">
        <div className="text-muted-foreground text-xs md:text-sm">Native phrase:</div>
        <div className="font-medium leading-relaxed">{native}</div>

        <div className="text-muted-foreground text-xs md:text-sm">Your attempt:</div>
        <div className="font-medium leading-relaxed flex flex-wrap gap-1">
          {attemptWords.map((word, idx) => {
            const clean = word.toLowerCase().replace(/[.,!?]/g, "");
            const severity = colorMap[clean];
            const mark = markMap[clean];
            return (
              <span key={idx} className={cn(getColor(severity), "relative")}>{
                mark ? <>{word}<sup className="text-[10px] font-semibold">{mark}</sup></> : word
              }</span>
            );
          })}
        </div>

        {hasDeviations ? (
          <div className="mt-2 space-y-2">
            {indexedDeviations.map((dev, idx) => (
              <div key={idx} className="text-xs leading-snug">
                <sup className="text-red-500 font-bold mr-1">{dev.index}</sup>
                <span className="font-medium">{dev.word}:</span> {dev.note}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-green-700 font-medium">✔️ Excellent pronunciation. Everything sounds natural and phonetically accurate.</div>
        )}
      </CardContent>
    </Card>
  );
}
