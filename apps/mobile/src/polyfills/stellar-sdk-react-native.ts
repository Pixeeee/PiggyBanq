import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';

type EventInitShim = {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
};

type MessageEventInitShim = EventInitShim & {
  data?: unknown;
  lastEventId?: string;
  origin?: string;
};

type EventShim = {
  bubbles: boolean;
  cancelable: boolean;
  composed: boolean;
  currentTarget: unknown;
  defaultPrevented: boolean;
  eventPhase: number;
  isTrusted: boolean;
  target: unknown;
  timeStamp: number;
  type: string;
  preventDefault(): void;
  stopImmediatePropagation(): void;
  stopPropagation(): void;
};

type EventListenerShim = ((event: EventShim) => void) | { handleEvent(event: EventShim): void };

type EventGlobal = typeof globalThis & {
  Buffer?: typeof Buffer;
  crypto?: {
    getRandomValues?: typeof Crypto.getRandomValues;
    randomUUID?(): string;
  };
  Event?: new (type: string, eventInitDict?: EventInitShim) => EventShim;
  EventTarget?: new () => {
    addEventListener(type: string, listener: EventListenerShim | null): void;
    removeEventListener(type: string, listener: EventListenerShim | null): void;
    dispatchEvent(event: EventShim): boolean;
  };
  MessageEvent?: new (type: string, eventInitDict?: MessageEventInitShim) => EventShim & {
    data: unknown;
    lastEventId: string;
    origin: string;
  };
};

const eventGlobal = globalThis as EventGlobal;

if (typeof eventGlobal.Buffer !== 'function') {
  eventGlobal.Buffer = Buffer;
}

eventGlobal.crypto = eventGlobal.crypto ?? {};

if (typeof eventGlobal.crypto.getRandomValues !== 'function') {
  eventGlobal.crypto.getRandomValues = Crypto.getRandomValues;
}

if (typeof eventGlobal.crypto.randomUUID !== 'function') {
  eventGlobal.crypto.randomUUID = Crypto.randomUUID;
}

if (typeof eventGlobal.Event !== 'function') {
  eventGlobal.Event = class ReactNativeEvent {
    readonly bubbles: boolean;
    readonly cancelable: boolean;
    readonly composed: boolean;
    currentTarget = null;
    defaultPrevented = false;
    readonly eventPhase = 0;
    readonly isTrusted = false;
    target = null;
    readonly timeStamp = Date.now();
    readonly type: string;

    constructor(type: string, eventInitDict: EventInitShim = {}) {
      this.type = type;
      this.bubbles = Boolean(eventInitDict.bubbles);
      this.cancelable = Boolean(eventInitDict.cancelable);
      this.composed = Boolean(eventInitDict.composed);
    }

    preventDefault() {
      if (this.cancelable) {
        this.defaultPrevented = true;
      }
    }
    stopImmediatePropagation() {}
    stopPropagation() {}
  };
}

if (typeof eventGlobal.EventTarget !== 'function') {
  eventGlobal.EventTarget = class ReactNativeEventTarget {
    private readonly listeners = new Map<string, Set<EventListenerShim>>();

    addEventListener(type: string, listener: EventListenerShim | null) {
      if (!listener) return;
      const listenersForType = this.listeners.get(type) ?? new Set<EventListenerShim>();
      listenersForType.add(listener);
      this.listeners.set(type, listenersForType);
    }

    removeEventListener(type: string, listener: EventListenerShim | null) {
      if (!listener) return;
      this.listeners.get(type)?.delete(listener);
    }

    dispatchEvent(event: EventShim) {
      event.target = event.target ?? this;
      event.currentTarget = this;

      for (const listener of this.listeners.get(event.type) ?? []) {
        if (typeof listener === 'function') {
          listener(event);
        } else {
          listener.handleEvent(event);
        }
      }

      return !event.defaultPrevented;
    }
  };
}

if (typeof eventGlobal.MessageEvent !== 'function') {
  eventGlobal.MessageEvent = class ReactNativeMessageEvent extends eventGlobal.Event {
    readonly data: unknown;
    readonly lastEventId: string;
    readonly origin: string;

    constructor(type: string, eventInitDict: MessageEventInitShim = {}) {
      super(type, eventInitDict);
      this.data = eventInitDict.data;
      this.lastEventId = eventInitDict.lastEventId ?? '';
      this.origin = eventInitDict.origin ?? '';
    }
  };
}
