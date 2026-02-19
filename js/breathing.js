class BreathingExercise {
  constructor(program, callbacks) {
    this.program = program;
    this.cb = callbacks; // { onBreathChange, onSetChange, onPhaseChange, onComplete, onTick }
    this.phases = [program.phase1, program.phase2];
    this.phaseIndex = 0;
    this.setIndex = 0;
    this.breathState = 'inhale'; // 'inhale' | 'hold' | 'exhale'
    this.holdDuration = 3; // seconds
    this.running = false;
    this.paused = false;
    this._timer = null;
    this._elapsed = 0; // ms elapsed in current step
    this._lastTick = 0;
    this._tickTimer = null;
    this._holdTimers = []; // for hold countdown speech
  }

  get currentPhase() {
    return this.phases[this.phaseIndex];
  }

  get currentDuration() {
    if (this.breathState === 'inhale') return this.currentPhase.inhaleDuration;
    if (this.breathState === 'hold') return this.holdDuration;
    return this.currentPhase.exhaleDuration;
  }

  get remainingMs() {
    return this.currentDuration * 1000 - this._elapsed;
  }

  get totalSets() {
    let total = 0;
    for (const phase of this.phases) total += phase.sets;
    return total;
  }

  get completedSets() {
    let done = 0;
    for (let i = 0; i < this.phaseIndex; i++) done += this.phases[i].sets;
    done += this.setIndex;
    return done;
  }

  start() {
    this.running = true;
    this.paused = false;
    this.phaseIndex = 0;
    this.setIndex = 0;
    this.breathState = 'inhale';
    this._elapsed = 0;

    this._notifyPhase();
    this._notifySet();
    this._startStep();
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    clearTimeout(this._timer);
    clearInterval(this._tickTimer);
    this._clearHoldTimers();
    this._elapsed += Date.now() - this._lastTick;
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    const remaining = this.remainingMs;
    this._scheduleNext(remaining);
    // Re-schedule hold countdown speech if resuming during hold
    if (this.breathState === 'hold') {
      this._scheduleHoldSpeech(remaining);
    }
    this._startTicking();
  }

  stop() {
    this.running = false;
    this.paused = false;
    clearTimeout(this._timer);
    clearInterval(this._tickTimer);
    this._clearHoldTimers();
  }

  _startStep() {
    this._elapsed = 0;
    const state = this.breathState;
    const duration = this.currentDuration;

    if (this.cb.onBreathChange) {
      this.cb.onBreathChange(state, duration);
    }

    if (state === 'hold') {
      this._scheduleHoldSpeech(duration * 1000);
    }

    this._scheduleNext(duration * 1000);
    this._startTicking();
  }

  _scheduleHoldSpeech(remainingMs) {
    this._clearHoldTimers();
    // "hold" at the start, "two" at 2s left, "one" at 1s left
    const words = [
      { text: 'hold', atRemaining: remainingMs },
      { text: 'two', atRemaining: 2000 },
      { text: 'one', atRemaining: 1000 }
    ];
    for (const w of words) {
      const delay = remainingMs - w.atRemaining;
      if (delay >= 0) {
        this._holdTimers.push(
          setTimeout(() => {
            if (this.cb.onHoldSpeak) this.cb.onHoldSpeak(w.text);
          }, delay)
        );
      }
    }
  }

  _clearHoldTimers() {
    for (const t of this._holdTimers) clearTimeout(t);
    this._holdTimers = [];
  }

  _scheduleNext(ms) {
    this._lastTick = Date.now();
    this._timer = setTimeout(() => this._advance(), ms);
  }

  _startTicking() {
    clearInterval(this._tickTimer);
    this._tickTimer = setInterval(() => {
      if (!this.running || this.paused) return;
      const now = Date.now();
      const total = this._elapsed + (now - this._lastTick);
      const remaining = Math.max(0, this.currentDuration * 1000 - total);
      if (this.cb.onTick) {
        this.cb.onTick(Math.ceil(remaining / 1000));
      }
    }, 100);
  }

  _advance() {
    clearInterval(this._tickTimer);
    this._clearHoldTimers();

    if (this.breathState === 'inhale') {
      // Move to hold
      this.breathState = 'hold';
      this._startStep();
    } else if (this.breathState === 'hold') {
      // Move to exhale
      this.breathState = 'exhale';
      this._startStep();
    } else {
      // Exhale done — finished one set
      this.breathState = 'inhale';
      this.setIndex++;

      if (this.setIndex >= this.currentPhase.sets) {
        this.phaseIndex++;
        this.setIndex = 0;

        if (this.phaseIndex >= this.phases.length) {
          this.running = false;
          if (this.cb.onComplete) this.cb.onComplete();
          return;
        }

        this._notifyPhase();
      }

      this._notifySet();
      this._startStep();
    }
  }

  _notifyPhase() {
    if (this.cb.onPhaseChange) {
      this.cb.onPhaseChange(this.phaseIndex + 1, this.phases.length);
    }
  }

  _notifySet() {
    if (this.cb.onSetChange) {
      this.cb.onSetChange(
        this.setIndex + 1,
        this.currentPhase.sets,
        this.completedSets,
        this.totalSets
      );
    }
  }
}
