export const Alert = { alert: () => undefined };
export const Platform = { OS: "ios" };
export const Image = { getSize: (_uri: string, success: (width: number, height: number) => void) => success(1, 1) };
