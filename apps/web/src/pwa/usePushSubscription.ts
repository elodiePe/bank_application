import { useCallback, useEffect, useState } from 'react';
import { fetchVapidPublicKey, subscribePush, unsubscribePush } from '../services/push.service.js';

export type PushSupportState = 'unsupported' | 'checking' | 'subscribed' | 'unsubscribed' | 'denied';

function urlBase64ToUint8Array(base64Url: string): BufferSource {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

export function usePushSubscription() {
  const [state, setState] = useState<PushSupportState>('checking');

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  const refresh = useCallback(async () => {
    if (!isSupported) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    setState(existing ? 'subscribed' : 'unsubscribed');
  }, [isSupported]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setState('denied');
      return;
    }

    const { publicKey } = await fetchVapidPublicKey();
    if (!publicKey) {
      // Server has no VAPID keys configured — nothing to subscribe to.
      setState('unsubscribed');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const json = subscription.toJSON();
    await subscribePush({
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh!,
      auth: json.keys!.auth!,
    });
    setState('subscribed');
  }, []);

  const unsubscribe = useCallback(async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await unsubscribePush(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setState('unsubscribed');
  }, []);

  return { state, subscribe, unsubscribe };
}
