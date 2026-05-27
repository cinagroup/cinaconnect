declare module 'react-native-vision-camera' {
  export type CameraPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'restricted';

  export class Camera {
    static requestCameraPermission(): Promise<CameraPermissionStatus>;
    static getCameraPermissionStatus(): CameraPermissionStatus;
    static getAvailableCameraDevices(): Array<{ id: string }>;;
  }
  export function useCameraDevice(type: string): { id: string } | null;
  export function useCameraPermission(): {
    hasPermission: boolean;
    requestPermission: () => Promise<boolean>;
  };
  export function useCodeScanner(code: {
    onCodeScanned: (codes: Array<{ value: string }>) => void;
    codeTypes: string[];
  }): { onCodeScanned: (codes: Array<{ value: string }>) => void; codeTypes: string[] };
}
