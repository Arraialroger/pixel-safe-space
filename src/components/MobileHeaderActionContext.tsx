import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Ctx = {
  action: ReactNode | null;
  setAction: (n: ReactNode | null) => void;
};

const MobileHeaderActionContext = createContext<Ctx>({
  action: null,
  setAction: () => {},
});

export function MobileHeaderActionProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<ReactNode | null>(null);
  return (
    <MobileHeaderActionContext.Provider value={{ action, setAction }}>
      {children}
    </MobileHeaderActionContext.Provider>
  );
}

export function useMobileHeaderActionSlot() {
  return useContext(MobileHeaderActionContext);
}

/** Page-side hook: register a primary action on the mobile header. Pass null to clear. */
export function useMobileHeaderAction(node: ReactNode | null) {
  const { setAction } = useContext(MobileHeaderActionContext);
  useEffect(() => {
    setAction(node);
    return () => setAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);
}
