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

// Activity & Utility
import ShoeActivitySvg from "../assets/images/sepatu.svg";
import FireCaloriesSvg from "../assets/images/api.svg";
import ClockSvg from "../assets/images/jam.svg";
import ClockAltSvg from "../assets/images/jam2.svg";
import CommunitySvg from "../assets/images/comm.svg";
import Group290Svg from "../assets/images/Group 290.svg";

// Vector SVG icons for accessible, emoji-free UI elements
import Svg, { Path, Circle, Polyline, Line, Polygon } from "react-native-svg";

export interface CustomSvgProps extends SvgProps {
  size?: number;
}

export const SearchIconSvg = ({ size = 20, color, stroke, strokeWidth = 2.2, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#6b7280"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Circle cx={11} cy={11} r={7.5} />
    <Path d="m21 21-4.35-4.35" />
  </Svg>
);

export const CloseIconSvg = ({ size = 18, color, stroke, strokeWidth = 2.2, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#6b7280"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const CheckIconSvg = ({ size = 18, color, stroke, strokeWidth = 2.4, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#16a34a"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);

export const EditIconSvg = ({ size = 18, color, stroke, strokeWidth = 2, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#0d9488"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <Path d="m15 5 4 4" />
  </Svg>
);

export const SettingsIconSvg = ({ size = 18, color, stroke, strokeWidth = 2, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#0d9488"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <Circle cx="12" cy="12" r="3" />
  </Svg>
);

export const LogoutIconSvg = ({ size = 18, color, stroke, strokeWidth = 2, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#6b7280"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Polyline points="16 17 21 12 16 7" />
    <Line x1="21" y1="12" x2="9" y2="12" />
  </Svg>
);

export const TrashIconSvg = ({ size = 18, color, stroke, strokeWidth = 2, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#ef4444"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Path d="M3 6h18" />
    <Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <Line x1="10" y1="11" x2="10" y2="17" />
    <Line x1="14" y1="11" x2="14" y2="17" />
  </Svg>
);

export const LightbulbIconSvg = ({ size = 20, color, stroke, strokeWidth = 2, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#047857"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <Path d="M9 18h6" />
    <Path d="M10 22h4" />
  </Svg>
);

export const TagIconSvg = ({ size = 14, color, stroke, strokeWidth = 2.2, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#047857"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
    <Circle cx="7" cy="7" r=".75" fill={stroke || color || "#047857"} />
  </Svg>
);

export const FemaleIconSvg = ({ size = 24, color, stroke, strokeWidth = 2.2, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#047857"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Circle cx="12" cy="8" r="5" />
    <Path d="M12 13v8" />
    <Path d="M9 17h6" />
  </Svg>
);

export const MaleIconSvg = ({ size = 24, color, stroke, strokeWidth = 2.2, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#047857"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Circle cx="10" cy="14" r="5" />
    <Path d="M19 5h-5" />
    <Path d="M19 5v5" />
    <Path d="M19 5l-5.5 5.5" />
  </Svg>
);

export const ChevronRightIconSvg = ({ size = 18, color, stroke, strokeWidth = 2.2, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#9ca3af"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Polyline points="9 18 15 12 9 6" />
  </Svg>
);

export const ChevronLeftIconSvg = ({ size = 20, color, stroke, strokeWidth = 2.2, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#1f2937"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Polyline points="15 18 9 12 15 6" />
  </Svg>
);

export const ChevronDownIconSvg = ({ size = 18, color, stroke, strokeWidth = 2.2, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#9ca3af"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Polyline points="6 9 12 15 18 9" />
  </Svg>
);

export const MinusIconSvg = ({ size = 18, color, stroke, strokeWidth = 2.4, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#1f2937"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);

export const PlusIconSvg = ({ size = 18, color, stroke, strokeWidth = 2.4, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#1f2937"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Line x1="12" y1="5" x2="12" y2="19" />
    <Line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);

export const ZapIconSvg = ({ size = 16, color, stroke, strokeWidth = 2, fill = "none", ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={stroke || color || "#0d9488"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Svg>
);

export const RefreshIconSvg = ({ size = 16, color, stroke, strokeWidth = 2, ...props }: CustomSvgProps) => (
  <Svg
    width={props.width || size}
    height={props.height || size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke || color || "#047857"}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <Polyline points="21 3 21 8 16 8" />
    <Path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <Polyline points="3 21 3 16 8 16" />
  </Svg>
);

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
  Search: SearchIconSvg,

  // Vector UI Icons (Emoji & Slop Free)
  Close: CloseIconSvg,
  Check: CheckIconSvg,
  Edit: EditIconSvg,
  Settings: SettingsIconSvg,
  Logout: LogoutIconSvg,
  Trash: TrashIconSvg,
  Lightbulb: LightbulbIconSvg,
  Tag: TagIconSvg,
  Female: FemaleIconSvg,
  Male: MaleIconSvg,
  ChevronRight: ChevronRightIconSvg,
  ChevronLeft: ChevronLeftIconSvg,
  ChevronDown: ChevronDownIconSvg,
  Minus: MinusIconSvg,
  Plus: PlusIconSvg,
  Zap: ZapIconSvg,
  Refresh: RefreshIconSvg,
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
