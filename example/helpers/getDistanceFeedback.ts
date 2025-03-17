export const getDistanceFeedback = (
  boxAreaRatio: number,
  threshold: number = 0.1,
  currentFeedback: string = "",
): string => {
  "worklet"
  if (boxAreaRatio > 1 + threshold && currentFeedback !== "Move farther away") {
    return "Move farther away";
  } else if (
    boxAreaRatio < 1 - threshold &&
    currentFeedback !== "Move closer"
  ) {
    return "Move closer";
  }
  return currentFeedback;
};
