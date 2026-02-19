class BreathingExercise {
  constructor(program, callbacks) {
    this.program = program;
    this.cb = callbacks; // { onBreathChange, onSetChange, onPhaseChange, onComplete, onTick }
    this.phases = [program.phase1, program.phase2];
    this.phaseIndex = 0;
    this.setIndex = 0;
    this.isInhale = true;
    this.running = false;
    this.paused = false;
    this._timer = null;
    this._elapsed = 0; // ms elapsed in current breath
    this._lastTick = 0;
    this._tickTimer = null;
  }

  get currentPhase() {
    return this.phases[this.phaseIndex];
  }

  get currentDuration() {
    return this.isInhale ? this.currentPhase.inhaleDuration : this.currentPhase.exhaleDuration;
  }

  get remainingMs() {
    return this.currentDuration * 1000 - this._elapsed;
  }

  start() {
    this.running = true;
    this.paused = false;
    this.phaseIndex = 0;
    this.setIndex = 0;
    this.isInhale = true;
    this._elapsed = 0;

    this._notifyPhase();
    this._notifySet();
    this._startBreath();
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    clearTimeout(this._timer);
    clearInterval(this._tickTimer);
    // Capture how much time passed since last schedule
    this._elapsed += Date.now() - this._lastTick;
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this._scheduleNext(this.remainingMs);
    this._startTicking();
  }

  stop() {
    this.running = false;
    this.paused = false;
    clearTimeout(this._timer);
    clearInterval(this._tickTimer);
  }

  _startBreath() {
    this._elapsed = 0;
    const type = this.isInhale ? 'inhale' : 'exhale';
    const duration = this.currentDuration;

    if (this.cb.onBreathChange) {
      this.cb.onBreathChange(type, duration);
    }

    this._scheduleNext(duration * 1000);
    this._startTicking();
  }

  _scheduleNext(ms) {
    this._lastTick = Date.now();
    this._timer = setTimeout(() => this._advance(), ms);
  }

  _startTicking() {
    clearInterval(this._tickTimer);
    // Tick every 100ms for countdown display
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

    if (this.isInhale) {
      // Move to exhale
      this.isInhale = false;
      this._startBreath();
    } else {
      // Finished one set
      this.isInhale = true;
      this.setIndex++;

      if (this.setIndex >= this.currentPhase.sets) {
        // Phase complete
        this.phaseIndex++;
        this.setIndex = 0;

        if (this.phaseIndex >= this.phases.length) {
          // All done
          this.running = false;
          if (this.cb.onComplete) this.cb.onComplete();
          return;
        }

        this._notifyPhase();
      }

      this._notifySet();
      this._startBreath();
    }
  }

  _notifyPhase() {
    if (this.cb.onPhaseChange) {
      this.cb.onPhaseChange(this.phaseIndex + 1, this.phases.length);
    }
  }

  _notifySet() {
    if (this.cb.onSetChange) {
      this.cb.onSetChange(this.setIndex + 1, this.currentPhase.sets);
    }
  }
}
