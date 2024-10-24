import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to Tmsvision.web.ts
// and on native platforms to Tmsvision.ts
import TmsvisionModule from './TmsvisionModule';
import TmsvisionView from './TmsvisionView';
import { ChangeEventPayload, TmsvisionViewProps } from './Tmsvision.types';

// Get the native constant value.
export const PI = TmsvisionModule.PI;

export function hello(): string {
  return TmsvisionModule.hello();
}

export async function setValueAsync(value: string) {
  return await TmsvisionModule.setValueAsync(value);
}

const emitter = new EventEmitter(TmsvisionModule ?? NativeModulesProxy.Tmsvision);

export function addChangeListener(listener: (event: ChangeEventPayload) => void): Subscription {
  return emitter.addListener<ChangeEventPayload>('onChange', listener);
}

export { TmsvisionView, TmsvisionViewProps, ChangeEventPayload };
