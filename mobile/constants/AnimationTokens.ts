export const AnimationTimings = {
  microFast: 75,
  micro: 100,
  microSlow: 150,
  standardFast: 180,
  standard: 240,
  standardSlow: 300,
  emphasisFast: 320,
  emphasis: 400,
  emphasisSlow: 500,
  componentFast: 180,
  component: 240,
  componentSlow: 300,
  pageFast: 320,
  page: 400,
  pageSlow: 500,
};

/**
 * Apple Design Spring Physics (WWDC 2018 / WWDC 2026 guidelines)
 * - Critically damped (damping ratio = 1.0): clean settle, zero overshoot.
 * - Under-damped (damping ratio ≈ 0.8): subtle momentum bounce for gestures/flicks.
 */
export const AnimationEasings = {
  // Natural organic deceleration
  decelerate: (t: number) => t,
  standard: (t: number) => t,
  entrance: (t: number) => t,

  // Apple Critically Damped UI Spring (damping ratio = 1.0, response ≈ 0.35s)
  get appleDefaultSpring() {
    return {
      damping: 28,
      stiffness: 300,
      mass: 0.65,
      overshootClamping: true,
    };
  },

  // Apple Momentum Spring (damping ratio ≈ 0.82 for flick / swipe release)
  get appleMomentumSpring() {
    return {
      damping: 22,
      stiffness: 280,
      mass: 0.65,
      overshootClamping: false,
    };
  },

  // Instant press spring for buttons and cards (immediate pointer-down response)
  get pressSpringConfig() {
    return {
      damping: 26,
      stiffness: 320,
      mass: 0.5,
      overshootClamping: true,
    };
  },

  // Tab & navigation spring
  get tabSpringConfig() {
    return {
      damping: 27,
      stiffness: 280,
      mass: 0.6,
      overshootClamping: true,
    };
  },

  get microSpringConfig() {
    return {
      damping: 25,
      stiffness: 260,
      mass: 0.6,
      overshootClamping: true,
    };
  },
};

export const AnimationScales = {
  // Apple tactile press interactions (subtle, controlled, instant feedback)
  pressButton: 0.97,
  pressCard: 0.985,
  pressChip: 0.96,
  hoverCard: 1.008,
  activeTab: 1.06,
  modalEntry: 0.96,
};

export const AnimationDistances = {
  cardHoverY: -2,
  tabActiveY: -1,
  modalSlideY: 16,
  sectionStaggerY: 10,
};
