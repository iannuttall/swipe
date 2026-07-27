export type AlpineRuntime = {
  data: (
    name: string,
    callback: (...args: any[]) => Record<string, unknown>,
  ) => void;
};
