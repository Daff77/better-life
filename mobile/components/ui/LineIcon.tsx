import React from "react";
import Svg, { Path, Circle, Rect } from "react-native-svg";

/**
 * Line icons drawn on a 24px grid with a 1.7 stroke, round caps and joins.
 * One consistent family for navigation, cards and list rows.
 */
export type LineIconName =
  | "arrowUpRight"
  | "arrowLeft"
  | "plus"
  | "minus"
  | "close"
  | "check"
  | "chevronRight"
  | "chevronDown"
  | "dots"
  | "search"
  | "home"
  | "utensils"
  | "book"
  | "user"
  | "calendar"
  | "chart"
  | "crown"
  | "flame"
  | "steps"
  | "droplet"
  | "protein"
  | "dumbbell"
  | "apple"
  | "sunrise"
  | "sun"
  | "moon"
  | "cup"
  | "leaf"
  | "bell"
  | "clock"
  | "wallet"
  | "trash"
  | "settings"
  | "edit"
  | "logout"
  | "target"
  | "scale"
  | "bookmark"
  | "sparkle"
  | "lock"
  | "refresh"
  | "arrow-up-right"
  | "alert"
  | "download"
  | "sliders"
  | "swap"
  | "shield"
  | "heart"
  | "eye"
  | "eyeOff"
  | "mail"
  | "ruler";

export interface LineIconProps {
  name: LineIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const LineIcon: React.FC<LineIconProps> = ({ name, size = 20, color = "#121a16", strokeWidth = 1.7 }) => {
  const p = { stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const body = (() => {
    switch (name) {
      case "arrowUpRight":
      case "arrow-up-right":
        return <Path {...p} d="M7 17 17 7M9 7h8v8" />;
      case "arrowLeft":
        return <Path {...p} d="M19 12H5M11 6l-6 6 6 6" />;
      case "plus":
        return <Path {...p} d="M12 5v14M5 12h14" />;
      case "minus":
        return <Path {...p} d="M5 12h14" />;
      case "close":
        return <Path {...p} d="M6 6l12 12M18 6 6 18" />;
      case "check":
        return <Path {...p} d="m5 12.5 4.5 4.5L19 7.5" />;
      case "chevronRight":
        return <Path {...p} d="m9.5 6 6 6-6 6" />;
      case "chevronDown":
        return <Path {...p} d="m6 9.5 6 6 6-6" />;
      case "dots":
        return (
          <>
            <Circle cx={5.5} cy={12} r={1.3} fill={color} />
            <Circle cx={12} cy={12} r={1.3} fill={color} />
            <Circle cx={18.5} cy={12} r={1.3} fill={color} />
          </>
        );
      case "search":
        return (
          <>
            <Circle {...p} cx={11} cy={11} r={6.5} />
            <Path {...p} d="m16 16 4 4" />
          </>
        );
      case "home":
        return <Path {...p} d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z" />;
      case "utensils":
        return (
          <>
            <Path {...p} d="M4.5 3.5v5.5a2.5 2.5 0 0 0 5 0V3.5M7 3.5v17" />
            <Path {...p} d="M16.5 3.5c-2.2 0-3.5 2.2-3.5 5 0 2.2 1.3 3.8 3.5 4v8M16.5 3.5v9" />
          </>
        );
      case "book":
        return <Path {...p} d="M5 4.5h10.5a3 3 0 0 1 3 3V20.5H8a3 3 0 0 1-3-3zM5 17.5a3 3 0 0 1 3-3h10.5M9 8.5h5.5" />;
      case "user":
        return (
          <>
            <Circle {...p} cx={12} cy={8.5} r={4} />
            <Path {...p} d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
          </>
        );
      case "calendar":
        return (
          <>
            <Rect {...p} x={4} y={5.5} width={16} height={15} rx={3} />
            <Path {...p} d="M8 3.5v4M16 3.5v4M4 10.5h16" />
          </>
        );
      case "chart":
        return <Path {...p} d="M5 20V11M10 20V5M15 20v-7M20 20V9" />;
      case "crown":
        return <Path {...p} d="M4 8.5 8 12l4-6.5 4 6.5 4-3.5-1.5 9.5h-13zM6 20.5h12" />;
      case "flame":
        return (
          <>
            <Path
              {...p}
              d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-3.2-2-5.6-3.8-7.6-.6 1.5-1.5 2.4-2.5 2.6.4-2.4-.2-4.8-2.2-6.5-.3 2.8-2.2 4.8-3.4 6.8A6.5 6.5 0 0 0 12 21z"
            />
            <Path
              {...p}
              d="M12 21a3 3 0 0 0 3-3c0-1.6-1.2-2.6-2.2-3.6-.4 1-.9 1.3-1.5 1.3-.3-.9-.5-1.5-.8-2.1A3 3 0 0 0 9 18a3 3 0 0 0 3 3z"
            />
          </>
        );
      case "steps":
        return (
          <>
            {/* Left footprint */}
            <Path
              {...p}
              d="M7.5 4C5.8 4 4.8 5.6 5 7.8c.2 1.8.8 3.2 2.4 3.2 1.5 0 2.2-1.4 2.3-3.2C9.8 5.6 9 4 7.5 4z"
            />
            <Path
              {...p}
              d="M5.5 13.2h3.8l-.3 1.8a1.7 1.7 0 0 1-3.4 0z"
            />
            {/* Right footprint */}
            <Path
              {...p}
              d="M16.5 8c-1.5 0-2.3 1.6-2.2 3.8.1 1.8.8 3.2 2.3 3.2 1.6 0 2.2-1.4 2.4-3.2.2-2.2-.8-3.8-2.5-3.8z"
            />
            <Path
              {...p}
              d="M14.7 17.2h3.8l-.3 1.8a1.7 1.7 0 0 1-3.4 0z"
            />
          </>
        );
      case "droplet":
        return (
          <>
            <Path
              {...p}
              d="M12 3.5c-3.5 4.5-6.5 7.8-6.5 11.2a6.5 6.5 0 0 0 13 0c0-3.4-3-6.7-6.5-11.2z"
            />
            <Path {...p} d="M9.5 15.5a3 3 0 0 0 2.5 2.2" />
          </>
        );
      case "protein":
        return (
          <>
            <Path
              {...p}
              d="M10.2 11.4 6.2 15.4C4.5 14.8 3 16.2 3.8 17.8c.4.7 1.4.9 2 .4-.5.6-.3 1.6.4 2 1.6.8 3-.7 2.4-2.4l4-4c2.6 1.2 6.2.2 7.2-2.6.8-2.2.2-4.2-1.3-5.7-1.5-1.5-3.5-2.1-5.7-1.3-2.8 1-3.8 4.6-2.6 7.2z"
            />
            <Path {...p} d="M10.2 11.4q1.6.8 2.4 2.4" />
          </>
        );
      case "dumbbell":
        return (
          <>
            <Path {...p} d="M8.5 12h7M3 9.5v5M21 9.5v5" />
            <Rect {...p} x={5.5} y={6.5} width={3} height={11} rx={1.2} />
            <Rect {...p} x={15.5} y={6.5} width={3} height={11} rx={1.2} />
          </>
        );
      case "apple":
        return (
          <>
            <Path
              {...p}
              d="M12 7.5c-1.8-1-4.5-.8-5.8 1.2-1.6 2.4-1.2 6.8 1.2 9.8 1.1 1.3 2.4 1.8 3.5 1.2.7-.3 1.5-.3 2.2 0 1.1.6 2.4.1 3.5-1.2 2.4-3 2.8-7.4 1.2-9.8-1.3-2-4-2.2-5.8-1.2z"
            />
            <Path {...p} d="M12 7.5c0-2 1.2-3.8 3.2-4.2.2 2-1.2 3.8-3.2 4.2z" />
          </>
        );
      case "sunrise":
        return <Path {...p} d="M4 18.5h16M7 18.5a5 5 0 0 1 10 0M12 4v4M5.5 9.5l1.7 1.7M18.5 9.5l-1.7 1.7M9.5 6.5 12 4l2.5 2.5" />;
      case "sun":
        return (
          <>
            <Circle {...p} cx={12} cy={12} r={4} />
            <Path {...p} d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
          </>
        );
      case "moon":
        return <Path {...p} d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />;
      case "cup":
        return <Path {...p} d="M5 8.5h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8.5 3.5v2M12 3.5v2" />;
      case "leaf":
        return <Path {...p} d="M5 19c0-8 5-13.5 14.5-14-0.5 9.5-6 14.5-14 14.5zM5 19l7-7" />;
      case "bell":
        return <Path {...p} d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />;
      case "clock":
        return (
          <>
            <Circle {...p} cx={12} cy={12} r={8.5} />
            <Path {...p} d="M12 7.5V12l3 2" />
          </>
        );
      case "wallet":
        return <Path {...p} d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11v3M4 7.5v10A2.5 2.5 0 0 0 6.5 20H20V8.5H6.5A2.5 2.5 0 0 1 4 7.5zM16 14.2h.01" />;
      case "trash":
        return <Path {...p} d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />;
      case "settings":
        return (
          <>
            <Circle {...p} cx={12} cy={12} r={3} />
            <Path {...p} d="M12 2.8l2 2.1 2.9-.4.7 2.8 2.6 1.4-1 2.8 1 2.8-2.6 1.4-.7 2.8-2.9-.4-2 2.1-2-2.1-2.9.4-.7-2.8-2.6-1.4 1-2.8-1-2.8 2.6-1.4.7-2.8 2.9.4Z" />
          </>
        );
      case "edit":
        return <Path {...p} d="M4.5 19.5h4l10-10-4-4-10 10zM13 7l4 4" />;
      case "logout":
        return <Path {...p} d="M14 4.5H6.5v15H14M10 12h10M16.5 8.5 20 12l-3.5 3.5" />;
      case "target":
        return (
          <>
            <Circle {...p} cx={12} cy={12} r={8.5} />
            <Circle {...p} cx={12} cy={12} r={4.5} />
            <Circle cx={12} cy={12} r={1.2} fill={color} />
          </>
        );
      case "scale":
        return (
          <>
            <Rect {...p} x={3.5} y={4} width={17} height={16.5} rx={4} />
            <Path {...p} d="M8.5 9.5a5 5 0 0 1 7 0L12 12.5" />
          </>
        );
      case "bookmark":
        return <Path {...p} d="M6.5 4h11v16.5l-5.5-4-5.5 4z" />;
      case "sparkle":
        return <Path {...p} d="M12 3.5c.6 4.4 2.2 6 6.5 6.5-4.3.5-5.9 2.1-6.5 6.5-.6-4.4-2.2-6-6.5-6.5 4.3-.5 5.9-2.1 6.5-6.5zM18.5 15.5c.3 1.9 1 2.6 2.5 2.8-1.5.2-2.2.9-2.5 2.7-.3-1.8-1-2.5-2.5-2.7 1.5-.2 2.2-.9 2.5-2.8z" />;
      case "lock":
        return (
          <>
            <Rect {...p} x={5} y={10.5} width={14} height={10} rx={2.5} />
            <Path {...p} d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
          </>
        );
      case "refresh":
        return <Path {...p} d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />;
      case "alert":
        return (
          <>
            <Circle {...p} cx={12} cy={12} r={8.5} />
            <Path {...p} d="M12 8v4.5M12 16h.01" />
          </>
        );
      case "download":
        return <Path {...p} d="M12 4v11m0 0-4-4m4 4 4-4M5 19.5h14" />;
      case "sliders":
        return <Path {...p} d="M4 7h9M17 7h3M14 5v4M4 17h3M11 17h9M8 15v4" />;
      case "swap":
        return <Path {...p} d="M7 16V4m0 0L4 7m3-3 3 3M17 8v12m0 0 3-3m-3 3-3-3" />;
      case "shield":
        return <Path {...p} d="M12 3.5 5 6.5v5.5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6.5z" />;
      case "heart":
        return (
          <Path
            {...p}
            d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"
          />
        );
      case "eye":
        return (
          <>
            <Path {...p} d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
            <Circle {...p} cx={12} cy={12} r={3} />
          </>
        );
      case "eyeOff":
        return (
          <Path
            {...p}
            d="M4 4l16 16M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.9 3.6M6.6 7.4A15.6 15.6 0 0 0 2.5 12S6 18 12 18a9 9 0 0 0 4.1-1M9.9 9.9a3 3 0 0 0 4.2 4.2"
          />
        );
      case "mail":
        return (
          <>
            <Rect {...p} x={3.5} y={5.5} width={17} height={13} rx={2.5} />
            <Path {...p} d="m4.5 7 7.5 6 7.5-6" />
          </>
        );
      case "ruler":
        return <Path {...p} d="M4 15.5 15.5 4l4.5 4.5L8.5 20zM8 11.5l2 2M11 8.5l2 2M14 5.5l2 2" />;
    }
  })();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ pointerEvents: "none" }}>
      {body}
    </Svg>
  );
};

