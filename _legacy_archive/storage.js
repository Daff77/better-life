/**
 * Better Life - Client-side state manager and utility helper
 */
const BetterLifeState = {
  STORAGE_KEY: 'better_life_user_state',

  defaults: {
    user: {
      name: 'John Doe',
      email: 'johndoe25@gmail.com',
      phone: '+62 812-3456-7890'
    },
    goal: 'Eat balanced',
    weight: 65,
    height: 170,
    gender: 'Female',
    birthDate: { day: 15, month: 'June', year: 2000 },
    cookingSkill: 'Middle',
    dietType: 'Omnivore',
    allergies: ['Lactose'],
    targetCalories: 1950,
    consumedCalories: 259,
    steps: 3420,
    stepsGoal: 6000,
    exerciseCalories: 320,
    exerciseMinutes: 45,
    notificationsEnabled: true
  },

  getAll() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        this.saveAll(this.defaults);
        return { ...this.defaults };
      }
      return { ...this.defaults, ...JSON.parse(data) };
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
      return { ...this.defaults };
    }
  },

  saveAll(state) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not write to localStorage:', e);
    }
  },

  get(key, fallback = null) {
    const all = this.getAll();
    return all[key] !== undefined ? all[key] : fallback;
  },

  set(key, val) {
    const all = this.getAll();
    all[key] = val;
    this.saveAll(all);
    return all;
  },

  updateUser(userData) {
    const all = this.getAll();
    all.user = { ...all.user, ...userData };
    this.saveAll(all);
  },

  calculateCalories() {
    const state = this.getAll();
    const w = Number(state.weight) || 65;
    const h = Number(state.height) || 170;
    const gender = state.gender || 'Female';
    const goal = state.goal || 'Eat balanced';

    // Mifflin-St Jeor formula estimate (assuming ~25 years old)
    let bmr = 10 * w + 6.25 * h - 5 * 25;
    bmr += (gender === 'Male' ? 5 : -161);
    let maintenance = Math.round(bmr * 1.35);

    if (goal === 'Lose weight') {
      maintenance = Math.round(maintenance * 0.82);
    } else if (goal === 'Gain muscle') {
      maintenance = Math.round(maintenance * 1.15);
    }

    state.targetCalories = maintenance;
    this.saveAll(state);
    return maintenance;
  },

  addCalories(calories) {
    const state = this.getAll();
    state.consumedCalories = Math.max(0, Math.round((Number(state.consumedCalories) || 0) + calories));
    this.saveAll(state);
    return state.consumedCalories;
  }
};

// Make accessible globally
window.BetterLifeState = BetterLifeState;
