(() => {
  // DOM refs
  const screens = {
    home: document.getElementById('screen-home'),
    editor: document.getElementById('screen-editor'),
    exercise: document.getElementById('screen-exercise')
  };

  const els = {
    programList: document.getElementById('program-list'),
    btnAdd: document.getElementById('btn-add-program'),
    btnEditorBack: document.getElementById('btn-editor-back'),
    btnDelete: document.getElementById('btn-delete-program'),
    editorTitle: document.getElementById('editor-title'),
    form: document.getElementById('program-form'),
    fieldName: document.getElementById('field-name'),
    fieldP1Sets: document.getElementById('field-p1-sets'),
    fieldP1Inhale: document.getElementById('field-p1-inhale'),
    fieldP1Exhale: document.getElementById('field-p1-exhale'),
    fieldP2Sets: document.getElementById('field-p2-sets'),
    fieldP2Inhale: document.getElementById('field-p2-inhale'),
    fieldP2Exhale: document.getElementById('field-p2-exhale'),
    btnExerciseBack: document.getElementById('btn-exercise-back'),
    exerciseTitle: document.getElementById('exercise-title'),
    exercisePhase: document.getElementById('exercise-phase'),
    exerciseSet: document.getElementById('exercise-set'),
    breathingCircle: document.getElementById('breathing-circle'),
    breathingLabel: document.getElementById('breathing-label'),
    breathingTimer: document.getElementById('breathing-timer'),
    btnStart: document.getElementById('btn-start-exercise'),
    btnPause: document.getElementById('btn-pause-exercise')
  };

  let currentView = 'home';
  let editingProgramId = null;
  let exercise = null;

  // View management
  function showView(name) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    screens[name].classList.add('active');
    currentView = name;
  }

  // Home screen
  function renderProgramList() {
    const programs = Storage.getAll();
    els.programList.innerHTML = programs
      .map(
        (p) => `
      <div class="program-card" data-id="${p.id}">
        <div class="program-card-info">
          <div class="program-card-name">${escapeHtml(p.name)}</div>
          <div class="program-card-detail">
            P1: ${p.phase1.sets} sets (${p.phase1.inhaleDuration}s/${p.phase1.exhaleDuration}s)
            &middot;
            P2: ${p.phase2.sets} sets (${p.phase2.inhaleDuration}s/${p.phase2.exhaleDuration}s)
          </div>
        </div>
        <div class="program-card-actions">
          <button class="btn-icon" data-action="edit" data-id="${p.id}" aria-label="Edit">&#9998;</button>
          <button class="btn-icon" data-action="play" data-id="${p.id}" aria-label="Start">&#9654;</button>
        </div>
      </div>`
      )
      .join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Program list event delegation
  els.programList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit') {
      openEditor(id);
    } else if (btn.dataset.action === 'play') {
      // Init audio on this user gesture so voices load before exercise starts
      Audio.init();
      openExercise(id);
    }
  });

  els.btnAdd.addEventListener('click', () => openEditor(null));

  // Editor
  function openEditor(id) {
    editingProgramId = id;
    const program = id ? Storage.getById(id) : null;

    els.editorTitle.textContent = program ? 'Edit Program' : 'New Program';
    els.btnDelete.classList.toggle('hidden', !program);

    els.fieldName.value = program ? program.name : '';
    els.fieldP1Sets.value = program ? program.phase1.sets : '';
    els.fieldP1Inhale.value = program ? program.phase1.inhaleDuration : '';
    els.fieldP1Exhale.value = program ? program.phase1.exhaleDuration : '';
    els.fieldP2Sets.value = program ? program.phase2.sets : '';
    els.fieldP2Inhale.value = program ? program.phase2.inhaleDuration : '';
    els.fieldP2Exhale.value = program ? program.phase2.exhaleDuration : '';

    showView('editor');
  }

  els.btnEditorBack.addEventListener('click', () => {
    showView('home');
    renderProgramList();
  });

  els.btnDelete.addEventListener('click', () => {
    if (editingProgramId && confirm('Delete this program?')) {
      Storage.remove(editingProgramId);
      showView('home');
      renderProgramList();
    }
  });

  els.form.addEventListener('submit', (e) => {
    e.preventDefault();

    const program = {
      id: editingProgramId || undefined,
      name: els.fieldName.value.trim(),
      phase1: {
        sets: parseInt(els.fieldP1Sets.value, 10),
        inhaleDuration: parseInt(els.fieldP1Inhale.value, 10),
        exhaleDuration: parseInt(els.fieldP1Exhale.value, 10)
      },
      phase2: {
        sets: parseInt(els.fieldP2Sets.value, 10),
        inhaleDuration: parseInt(els.fieldP2Inhale.value, 10),
        exhaleDuration: parseInt(els.fieldP2Exhale.value, 10)
      }
    };

    const saved = Storage.save(program);
    if (!saved) {
      alert('Please fill in all fields with valid values.');
      return;
    }

    showView('home');
    renderProgramList();
  });

  // Exercise
  function openExercise(id) {
    const program = Storage.getById(id);
    if (!program) return;

    els.exerciseTitle.textContent = program.name;
    els.breathingLabel.textContent = 'Ready';
    els.breathingTimer.textContent = '';
    els.exercisePhase.textContent = 'Phase 1';
    els.exerciseSet.textContent = `Set 1 / ${program.phase1.sets}`;
    els.btnStart.textContent = 'Start';
    els.btnStart.classList.remove('hidden');
    els.btnPause.classList.add('hidden');
    resetCircle();

    if (exercise) exercise.stop();
    exercise = new BreathingExercise(program, {
      onBreathChange,
      onSetChange,
      onPhaseChange,
      onComplete,
      onTick
    });

    showView('exercise');
  }

  function resetCircle() {
    const circle = els.breathingCircle;
    circle.classList.remove('animating', 'exhale');
    circle.style.transitionDuration = '';
    circle.style.transform = 'scale(0.6)';
  }

  function onBreathChange(type, duration) {
    const circle = els.breathingCircle;

    if (type === 'inhale') {
      Audio.speak('breathe in');
      els.breathingLabel.textContent = 'Breathe In';
      circle.classList.remove('exhale');
      // Reset to small, then animate to large
      circle.classList.remove('animating');
      circle.style.transform = 'scale(0.6)';
      // Force reflow to restart transition
      void circle.offsetWidth;
      circle.classList.add('animating');
      circle.style.transitionDuration = duration + 's';
      circle.style.transform = 'scale(1)';
    } else {
      Audio.speak('breathe out');
      els.breathingLabel.textContent = 'Breathe Out';
      circle.classList.add('exhale');
      circle.classList.remove('animating');
      circle.style.transform = 'scale(1)';
      void circle.offsetWidth;
      circle.classList.add('animating');
      circle.style.transitionDuration = duration + 's';
      circle.style.transform = 'scale(0.6)';
    }
  }

  function onSetChange(current, total) {
    els.exerciseSet.textContent = `Set ${current} / ${total}`;
  }

  function onPhaseChange(current, total) {
    els.exercisePhase.textContent = `Phase ${current}`;
    if (current > 1) {
      Audio.speak(`Phase ${current}`);
    }
  }

  function onTick(secondsLeft) {
    els.breathingTimer.textContent = secondsLeft > 0 ? secondsLeft : '';
  }

  function onComplete() {
    Audio.speak('Exercise complete. Well done.');
    els.breathingLabel.textContent = 'Done';
    els.breathingTimer.textContent = '';
    resetCircle();
    els.btnStart.textContent = 'Restart';
    els.btnStart.classList.remove('hidden');
    els.btnPause.classList.add('hidden');
  }

  // Exercise controls
  els.btnStart.addEventListener('click', () => {
    Audio.init();
    if (exercise) {
      exercise.start();
      els.btnStart.classList.add('hidden');
      els.btnPause.classList.remove('hidden');
      els.btnPause.textContent = 'Pause';
    }
  });

  els.btnPause.addEventListener('click', () => {
    if (!exercise || !exercise.running) return;

    if (exercise.paused) {
      exercise.resume();
      els.btnPause.textContent = 'Pause';
      // Resume circle animation
      els.breathingCircle.classList.add('animating');
    } else {
      exercise.pause();
      els.btnPause.textContent = 'Resume';
      // Pause circle animation by removing transition class
      els.breathingCircle.classList.remove('animating');
    }
  });

  els.btnExerciseBack.addEventListener('click', () => {
    if (exercise) {
      exercise.stop();
      Audio.stop();
    }
    resetCircle();
    showView('home');
    renderProgramList();
  });

  // Auto-pause on visibility change (phone call, switching apps)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && exercise && exercise.running && !exercise.paused) {
      exercise.pause();
      els.btnPause.textContent = 'Resume';
      els.breathingCircle.classList.remove('animating');
    }
  });

  // Service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Init
  renderProgramList();
})();
