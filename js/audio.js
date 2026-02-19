const Audio = (() => {
  let synth = null;
  let initialized = false;
  let silentEl = null;
  let keepAliveTimer = null;
  let ready = false;

  function init() {
    if (initialized) return;
    initialized = true;

    if ('speechSynthesis' in window) {
      synth = window.speechSynthesis;

      // Chrome loads voices asynchronously; wait for them
      function onVoicesReady() {
        ready = true;
      }
      if (synth.getVoices().length > 0) {
        ready = true;
      } else {
        synth.addEventListener('voiceschanged', onVoicesReady, { once: true });
        // Fallback: mark ready after a short delay even if event never fires
        setTimeout(() => { ready = true; }, 500);
      }

      // Chrome bug workaround: speechSynthesis gets internally paused
      // after ~15s of continuous use. Periodically poking it keeps it alive.
      keepAliveTimer = setInterval(() => {
        if (synth) {
          synth.resume();
        }
      }, 5000);
    }

    // Start silent audio loop to keep audio session alive on iOS
    silentEl = document.getElementById('silent-audio');
    if (silentEl) {
      silentEl.volume = 0.01;
      silentEl.play().catch(() => {});
    }
  }

  function speak(text) {
    if (!synth || !ready) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onerror = (e) => {
      console.warn('TTS error:', e.error);
    };
    synth.speak(utterance);
  }

  function stop() {
    if (synth) synth.cancel();
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    if (silentEl) {
      silentEl.pause();
      silentEl.currentTime = 0;
    }
  }

  return { init, speak, stop };
})();
