import * as React from 'react';

import { TmsvisionViewProps } from './Tmsvision.types';

export default function TmsvisionView(props: TmsvisionViewProps) {
  return (
    <div>
      <span>{props.name}</span>
    </div>
  );
}
