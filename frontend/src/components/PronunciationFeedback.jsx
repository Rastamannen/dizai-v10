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

  // Kopplar ihop fel med indexnummer
  const colorMap = {};
  const errorNotes = [];
  let counter = 1;

  deviations.forEach(({ word, severity, note }) => {
    const key = word.toLowerCase();
    if (!colorMap[key]) {
      colorMap[key] = { severity, index: counter };
      errorNotes.push({ index: counter, word, note });
      counter++;
    }
  });

  return (
    <Card className="w-full p-4 md:p-6 text-sm md:text-base space-y-4">
      <CardContent className="space-y-2">
        <div>
          <div className="text-muted-foreground text-xs">Original</div>
          <div className="font-semibold">{native}</div>
        </div>

        <div>
          <div className="text-muted-foreground text-xs">Your attempt</div>
          <div className="font-semibold flex flex-wrap gap-x-2 gap-y-1">
            {attemptWords.map((word, idx) => {
              const clean = word.toLowerCase().replace(/[.,!?]/g, "");
              const colorObj = colorMap[clean];
              return (
                <span key={idx} className={cn(getColor(colorObj?.severity))}>
                  {word}
                  {colorObj && <sup>{colorObj.index}</sup>}
                </span>
              );
            })}
          </div>
        </div>

        {errorNotes.length > 0 && (
          <div className="pt-2 border-t space-y-1 text-xs">
            {errorNotes.map(({ index, word, note }) => (
              <div key={index}>
                <strong>{index}.</strong> <em>{word}</em> – {note}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
