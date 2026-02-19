const Storage = (() => {
  const KEY = 'airway-programs';

  const defaults = [
    {
      id: 'default-1',
      name: 'Calm Breathing',
      phase1: { sets: 5, inhaleDuration: 4, exhaleDuration: 6 },
      phase2: { sets: 3, inhaleDuration: 6, exhaleDuration: 8 }
    },
    {
      id: 'default-2',
      name: 'Box Breathing',
      phase1: { sets: 6, inhaleDuration: 4, exhaleDuration: 4 },
      phase2: { sets: 4, inhaleDuration: 6, exhaleDuration: 6 }
    },
    {
      id: 'default-3',
      name: 'Deep Relaxation',
      phase1: { sets: 4, inhaleDuration: 5, exhaleDuration: 8 },
      phase2: { sets: 3, inhaleDuration: 7, exhaleDuration: 10 }
    }
  ];

  function _read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function _write(programs) {
    localStorage.setItem(KEY, JSON.stringify(programs));
  }

  function _generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function _validate(program) {
    if (!program.name || typeof program.name !== 'string' || !program.name.trim()) {
      return false;
    }
    for (const key of ['phase1', 'phase2']) {
      const p = program[key];
      if (!p) return false;
      if (!Number.isInteger(p.sets) || p.sets < 1 || p.sets > 99) return false;
      if (!Number.isInteger(p.inhaleDuration) || p.inhaleDuration < 1 || p.inhaleDuration > 60) return false;
      if (!Number.isInteger(p.exhaleDuration) || p.exhaleDuration < 1 || p.exhaleDuration > 60) return false;
    }
    return true;
  }

  function getAll() {
    let programs = _read();
    if (!programs) {
      programs = defaults;
      _write(programs);
    }
    return programs;
  }

  function getById(id) {
    return getAll().find((p) => p.id === id) || null;
  }

  function save(program) {
    if (!_validate(program)) return null;
    const programs = getAll();
    if (program.id) {
      const idx = programs.findIndex((p) => p.id === program.id);
      if (idx !== -1) {
        programs[idx] = program;
      } else {
        programs.push(program);
      }
    } else {
      program.id = _generateId();
      programs.push(program);
    }
    _write(programs);
    return program;
  }

  function remove(id) {
    const programs = getAll().filter((p) => p.id !== id);
    _write(programs);
  }

  return { getAll, getById, save, remove };
})();
