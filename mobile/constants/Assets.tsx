import React from "react";
import { SvgProps } from "react-native-svg";

// Brand & Logomark
import BetterLifeLogoSvg from "../assets/images/get started 1.svg";

// Social Auth Icons
import GoogleIconSvg from "../assets/images/google.svg";
import AppleIconSvg from "../assets/images/apple.svg";
import FacebookIconSvg from "../assets/images/fb.svg";

// Navigation & Actions
import HomeNavSvg from "../assets/images/home.svg";
import RankNavSvg from "../assets/images/rank.svg";
import ProgressNavSvg from "../assets/images/progress.svg";
import ProfileNavSvg from "../assets/images/profile.svg";
import BackArrowSvg from "../assets/images/back2.svg";
import LoginArrowSvg from "../assets/images/panah login.svg";
import DropdownArrowSvg from "../assets/images/arrowdown.svg";
import EyeSvg from "../assets/images/eye.svg";

// Nutrition & Meals
import BreakfastMealSvg from "../assets/images/breakfast.svg";
import LunchMealSvg from "../assets/images/lunch.svg";
import DinnerMealSvg from "../assets/images/dinner.svg";
import SnacksMealSvg from "../assets/images/snacks.svg";
import DrinksMealSvg from "../assets/images/drinks.svg";
import CookSvg from "../assets/images/cook.svg";

// Dietary Allergies & Ingredients
import EggAllergySvg from "../assets/images/egg.svg";
import GlutenAllergySvg from "../assets/images/gluten.svg";
import LactoseAllergySvg from "../assets/images/lactose.svg";
import NutsAllergySvg from "../assets/images/nuts.svg";
import SeafoodAllergySvg from "../assets/images/seafood.svg";

// Fitness, Activity & Time
import ShoeActivitySvg from "../assets/images/sepatu.svg";
import FireCaloriesSvg from "../assets/images/api.svg";
import ClockSvg from "../assets/images/jam.svg";
import ClockAltSvg from "../assets/images/jam2.svg";
import CommunitySvg from "../assets/images/comm.svg";
import Group290Svg from "../assets/images/Group 290.svg";

export const BrandImages = {
  logoPng: require("../assets/images/Better Life.png"),
  logoSmallPng: require("../assets/images/Better Life 1.png"),
  onboardingPng: require("../assets/images/get started 1.png"),
};

export const AppIcons = {
  // Brand
  LogoSvg: BetterLifeLogoSvg,

  // Social
  Google: GoogleIconSvg,
  Apple: AppleIconSvg,
  Facebook: FacebookIconSvg,

  // Navigation
  Home: HomeNavSvg,
  Rank: RankNavSvg,
  Progress: ProgressNavSvg,
  Profile: ProfileNavSvg,
  Back: BackArrowSvg,
  LoginArrow: LoginArrowSvg,
  Dropdown: DropdownArrowSvg,
  Eye: EyeSvg,

  // Meals
  Breakfast: BreakfastMealSvg,
  Lunch: LunchMealSvg,
  Dinner: DinnerMealSvg,
  Snacks: SnacksMealSvg,
  Drinks: DrinksMealSvg,
  Cook: CookSvg,

  // Allergies & Food Groups
  Egg: EggAllergySvg,
  Gluten: GlutenAllergySvg,
  Lactose: LactoseAllergySvg,
  Nuts: NutsAllergySvg,
  Seafood: SeafoodAllergySvg,

  // Activity & Utility
  Shoe: ShoeActivitySvg,
  Fire: FireCaloriesSvg,
  Clock: ClockSvg,
  ClockAlt: ClockAltSvg,
  Community: CommunitySvg,
  Group290: Group290Svg,
};

export type AppIconName = keyof typeof AppIcons;

export interface IconRendererProps extends SvgProps {
  name: AppIconName;
  size?: number;
}

export const IconRenderer: React.FC<IconRendererProps> = ({
  name,
  size = 24,
  width,
  height,
  ...props
}) => {
  const SvgComponent = AppIcons[name];
  if (!SvgComponent) return null;

  return (
    <SvgComponent
      width={width || size}
      height={height || size}
      {...props}
    />
  );
};
