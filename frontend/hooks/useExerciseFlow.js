// frontend/v10/hooks/useExerciseFlow.js

import { useMemo } from "react";

const useExerciseFlow = (exerciseSet, currentIndex) => {
  const currentExercise = useMemo(() => {
    return exerciseSet?.exercises?.[currentIndex] || null;
  }, [exerciseSet, currentIndex]);

  const isLast = exerciseSet && currentIndex >= exerciseSet.exercises.length - 1;

  const goNext = () => {
    if (!isLast) currentIndex++;
  };

  return { currentExercise, isLast, goNext };
};

export default useExerciseFlow;
