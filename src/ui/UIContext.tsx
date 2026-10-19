import { createContext, useContext } from 'react';

export interface UI {
  /** Open the add-task sheet, optionally pre-set to a day. */
  compose: (date?: string | null) => void;
  /** Open a task's detail sheet. */
  openTask: (id: string) => void;
  /** Start a focus session on a task. */
  focus: (id: string) => void;
}

export const UIContext = createContext<UI>({ compose: () => {}, openTask: () => {}, focus: () => {} });

export const useUI = () => useContext(UIContext);
