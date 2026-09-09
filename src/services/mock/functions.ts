export const getFunctions = (_app?: any, _region?: string) => ({ type: 'mock-functions' });

export const httpsCallable = (_functions: any, name: string) => {
  return async (data?: any) => {
    return { data: { success: true, message: `${name} executed successfully`, ...data } };
  };
};
