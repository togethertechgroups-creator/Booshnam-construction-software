// Cross-browser Fullscreen Service

export const isBrowserFullscreen = (): boolean => {
  const doc = document as any;
  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
};

export const requestBrowserFullscreen = async (element?: HTMLElement): Promise<boolean> => {
  const target = element || document.documentElement;
  const targetAny = target as any;
  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen();
      return true;
    } else if (targetAny.webkitRequestFullscreen) {
      targetAny.webkitRequestFullscreen();
      return true;
    } else if (targetAny.mozRequestFullScreen) {
      targetAny.mozRequestFullScreen();
      return true;
    } else if (targetAny.msRequestFullscreen) {
      targetAny.msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('Native fullscreen request blocked or not supported:', err);
  }
  return false;
};

export const exitBrowserFullscreen = async (): Promise<boolean> => {
  const doc = document as any;
  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
      return true;
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
      return true;
    } else if (doc.mozCancelFullScreen) {
      doc.mozCancelFullScreen();
      return true;
    } else if (doc.msExitFullscreen) {
      doc.msExitFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('Native fullscreen exit failed:', err);
  }
  return false;
};

export const toggleBrowserFullscreen = async (element?: HTMLElement): Promise<boolean> => {
  if (isBrowserFullscreen()) {
    await exitBrowserFullscreen();
    return false;
  } else {
    const success = await requestBrowserFullscreen(element);
    return success;
  }
};

export const addFullscreenChangeListener = (callback: (isFullscreen: boolean) => void) => {
  const handler = () => callback(isBrowserFullscreen());
  const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
  events.forEach(ev => document.addEventListener(ev, handler));
  return () => {
    events.forEach(ev => document.removeEventListener(ev, handler));
  };
};
