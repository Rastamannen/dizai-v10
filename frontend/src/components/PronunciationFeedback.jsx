// PronunciationFeedback.jsx
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

  const attemptWords = attempt.split(" ");
  const colorMap = {};
  deviations.forEach(({ word, severity }) => {
    colorMap[word.toLowerCase()] = severity;
  });

  return (
    <Card className="w-full p-4 md:p-6 text-sm md:text-base">
      <CardContent className="space-y-3">
        <div className="text-muted-foreground text-xs md:text-sm">Native phrase:</div>
        <div className="font-medium leading-relaxed">{native}</div>

        <div className="text-muted-foreground text-xs md:text-sm">Your attempt:</div>
        <div className="font-medium leading-relaxed flex flex-wrap gap-1">
          {attemptWords.map((word, idx) => {
            const clean = word.toLowerCase().replace(/[.,!?]/g, "");
            const severity = colorMap[clean];
            return (
              <span key={idx} className={cn(getColor(severity))}>
                {word}
              </span>
            );
          })}
        </div>

        {hasDeviations ? (
          <div className="mt-2 space-y-1">
            {deviations.map((dev, idx) => (
              <div key={idx} className="text-xs">
                <sup className="text-red-500 font-bold mr-1">{idx + 1}</sup>
                <strong>{dev.word}:</strong> {dev.note}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-green-700 font-medium">✔️ Perfekt uttal!</div>
        )}
      </CardContent>
    </Card>
  );
}
