"use client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} (${ms}ms)`)), ms);
    }),
  ]);
}

type PushDiagnostic = {
  supported: boolean;
  notificationPermission: NotificationPermission | "unavailable";
  hasController: boolean;
  registrationScope: string | null;
  activeState: string | null;
  installingState: string | null;
  waitingState: string | null;
  standalone: boolean;
  userAgent: string;
};

function isStandaloneDisplay() {
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in window.navigator && Boolean((window.navigator as any).standalone));
}

async function getReadyRegistration() {
  const registration = await withTimeout(
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }),
    10000,
    "Service worker registration timed out"
  );

  if (registration.active) {
    return registration;
  }

  const worker = registration.installing || registration.waiting;
  if (worker) {
    return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Service worker activation timed out. Close and reopen the installed app, then try again."));
      }, 15000);

      const onStateChange = () => {
        if (worker.state === "activated") {
          clearTimeout(timer);
          worker.removeEventListener("statechange", onStateChange);
          resolve(registration);
        }
        if (worker.state === "redundant") {
          clearTimeout(timer);
          worker.removeEventListener("statechange", onStateChange);
          reject(new Error("Service worker was replaced. Refresh the page and try again."));
        }
      };

      worker.addEventListener("statechange", onStateChange);
    });
  }

  throw new Error("Service worker is not active. Refresh the page and try again.");
}

export function isPushSupported() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export async function subscribeToPush(
  publicKey: string,
  permissionPromise?: Promise<NotificationPermission>
) {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported on this device.");
  }

  const permission = await withTimeout(
    permissionPromise || Notification.requestPermission(),
    15000,
    "Notification permission request timed out"
  );

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  try {
    const registration = await getReadyRegistration();

    const existing = await withTimeout(
      registration.pushManager.getSubscription(),
      10000,
      "Checking existing subscription timed out"
    );
    if (existing) return existing;

    return await withTimeout(
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }),
      15000,
      "Push subscription timed out"
    );
  } catch (error: any) {
    const details = await getPushDiagnostics().catch(() => null);
    const state = details
      ? ` active=${details.activeState || "none"} waiting=${details.waitingState || "none"} installing=${details.installingState || "none"} standalone=${details.standalone}`
      : "";
    throw new Error(`${error?.name ? `${error.name}: ` : ""}${error?.message || "Could not subscribe this device to push notifications."}${state}`);
  }
}

export async function getPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await getReadyRegistration();
  return registration.pushManager.getSubscription();
}

export async function getPushDiagnostics(): Promise<PushDiagnostic> {
  if (!isPushSupported()) {
    return {
      supported: false,
      notificationPermission: "Notification" in window ? Notification.permission : "unavailable",
      hasController: Boolean(navigator.serviceWorker?.controller),
      registrationScope: null,
      activeState: null,
      installingState: null,
      waitingState: null,
      standalone: isStandaloneDisplay(),
      userAgent: window.navigator.userAgent,
    };
  }

  const registration = await navigator.serviceWorker.getRegistration("/");
  return {
    supported: true,
    notificationPermission: Notification.permission,
    hasController: Boolean(navigator.serviceWorker.controller),
    registrationScope: registration?.scope || null,
    activeState: registration?.active?.state || null,
    installingState: registration?.installing?.state || null,
    waitingState: registration?.waiting?.state || null,
    standalone: isStandaloneDisplay(),
    userAgent: window.navigator.userAgent,
  };
}
