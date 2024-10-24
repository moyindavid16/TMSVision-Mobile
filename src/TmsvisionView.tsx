import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';

import { TmsvisionViewProps } from './Tmsvision.types';

const NativeView: React.ComponentType<TmsvisionViewProps> =
  requireNativeViewManager('Tmsvision');

export default function TmsvisionView(props: TmsvisionViewProps) {
  return <NativeView {...props} />;
}
