export const getStorage = (_app?: any) => ({ type: 'persistent-storage' });

export const ref = (_storage: any, path: string) => ({ path });

export const uploadBytesResumable = (_storageRef: any, file: Blob | File) => {
  let progressCb: ((snapshot: any) => void) | null = null;
  let completeCb: (() => void) | null = null;

  const url = URL.createObjectURL(file);

  setTimeout(() => {
    if (progressCb) progressCb({ bytesTransferred: file.size, totalBytes: file.size });
    if (completeCb) completeCb();
  }, 100);

  return {
    on: (
      _event: string,
      progress: (snapshot: any) => void,
      _error: (err: any) => void,
      complete: () => void
    ) => {
      progressCb = progress;
      completeCb = complete;
    },
    snapshot: {
      ref: {
        getDownloadURL: async () => url
      }
    }
  };
};

export const getDownloadURL = async (storageRef: any) => {
  return storageRef?.downloadUrl || `https://pileandloop.com/docs/${storageRef?.path || 'sample.pdf'}`;
};
