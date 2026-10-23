import type { PropsWithChildren } from 'react';

/** En el iPhone no añade nada. En el navegador (`dev-shell.web.tsx`) pone el marco y el simulador. */
export function DevShell({ children }: PropsWithChildren) {
  return children;
}
