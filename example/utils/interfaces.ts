export interface Point {
  x: number;
  y: number;
}

export interface Points {
  leftEye: Point[];
  rightEye: Point[];
  nose: Point[];
  leftEyeCenter: Point[];
  rightEyeCenter: Point[];
  noseCenter: Point[];
  noseLowerCenter: Point[];
  noseUpperCenter: Point[];
  leftPupil: Point[];
  rightPupil: Point[];
  boundingBox: { area: number }[];
}

export interface CalibratedPoints {
  leftEyeCenter: Point;
  rightEyeCenter: Point;
  noseCenter: Point;
  noseLowerCenter: Point;
  noseUpperCenter: Point;
}
