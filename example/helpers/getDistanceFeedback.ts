export const getDistanceFeedback = (
  boxAreaRatio: number,
  threshold: number = 0.1,
  currentFeedback: string = "",
): string => {
  "worklet";
  if (boxAreaRatio > 1 + threshold) {
    return "Move farther away";
  } else if (boxAreaRatio < 1 - threshold) {
    return "Move closer";
  }
  return "Good distance";
};
