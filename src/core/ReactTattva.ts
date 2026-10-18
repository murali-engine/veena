import { createContext, useContext, type ReactNode } from "react";
import { Tattva, type TattvaOptions, type TattvaState } from "./Tattva.ts";
import { themes, type Theme } from "./theme.ts";

export const VeenaThemeContext = createContext<Theme>(themes.dark);

export function useVeenaTheme(): Theme {
  return useContext(VeenaThemeContext);
}

export interface ReactRenderContext {
  theme: Theme;
}

export type ReactRenderer<State extends TattvaState> = (
  state: Readonly<State>,
  context: Readonly<ReactRenderContext>,
) => ReactNode;

export class ReactTattva<State extends TattvaState = TattvaState> extends Tattva<State> {
  override readonly kind = "react" as const;

  constructor(readonly render: ReactRenderer<State>, options: TattvaOptions<State> = {}) {
    super(options);
  }
}
