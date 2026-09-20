export const AnimationTimings = {
  microFast: 75,
  micro: 120,
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

export const AnimationEasings = {
  // Natural organic deceleration for iOS/Android
  decelerate: (t: number) => t,
  // Smooth subtle acceleration-deceleration
  standard: (t: number) => t,
  // Gentle entrance for content cards
  entrance: (t: number) => t,
  // Micro spring configs (avoiding excessive bounce)
  get microSpringConfig() {
    return {
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    };
  },
  get pressSpringConfig() {
    return {
      damping: 22,
      stiffness: 300,
      mass: 0.6,
    };
  },
  get tabSpringConfig() {
    return {
      damping: 24,
      stiffness: 260,
      mass: 0.7,
    };
  },
};

export const AnimationScales = {
  // Press interactions (subtle, controlled, zero rubber-banding)
  pressButton: 0.96,
  pressCard: 0.98,
  pressChip: 0.95,
  hoverCard: 1.01,
  activeTab: 1.08,
  modalEntry: 0.96,
};

export const AnimationDistances = {
  cardHoverY: -2,
  tabActiveY: -1.5,
  modalSlideY: 16,
  sectionStaggerY: 12,
};
