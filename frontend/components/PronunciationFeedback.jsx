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
            const obs = deviations.find((d) => d.word.toLowerCase() === clean)?.note;
            return (
              <div key={idx} className="relative group">
                <span className={cn(getColor(severity))}>{word}</span>
                {obs && (
                  <div className="absolute top-full left-0 mt-1 w-max bg-background shadow px-2 py-1 text-xs rounded hidden group-hover:block z-10 border">
                    {obs}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
