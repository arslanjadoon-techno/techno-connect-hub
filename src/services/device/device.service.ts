/**
 * Device Management Service
 * Provides standard service-class API integration for hardware device registration.
 */

export interface AddDevicePayload {
  deviceId: string;
  portalName: string;
  isAllowed: boolean;
  portalCredentials: number;
  employeeName: string;
}

export interface AddDeviceResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
  [key: string]: unknown;
}

export class DeviceService {
  public readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ||
      (import.meta.env.VITE_DEVICE_API_URL as string | undefined) ||
      "http://localhost:5001";
  }

  /**
   * Registers a hardware device for a designated portal user.
   * Endpoint: POST http://localhost:5001/api/Device/AddDevice
   *
   * @param payload Device attributes including ID, portal name, credentials level, and employee name.
   */
  async addDevice(payload: AddDevicePayload): Promise<AddDeviceResponse> {
    const cleanBase = this.baseUrl.replace(/\/$/, "");
    const url = `${cleanBase}/api/Device/AddDevice`;

    const requestBody = {
      deviceId: String(payload.deviceId || "").trim(),
      portalName: String(payload.portalName || "RTBDI").trim(),
      isAllowed: true, // Always true as required
      portalCredentials: Number(payload.portalCredentials),
      employeeName: String(payload.employeeName || "").trim(),
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          accept: "*/*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
    } catch (networkError: unknown) {
      const err = networkError as Error;
      throw new Error(
        `Unable to reach device service at ${url}. ${err?.message || "Please ensure the local service is running on port 5001."}`,
      );
    }

    let parsedData: any = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        parsedData = await response.json();
      } catch {
        parsedData = null;
      }
    } else {
      const rawText = await response.text();
      try {
        parsedData = JSON.parse(rawText);
      } catch {
        parsedData = { message: rawText };
      }
    }

    if (!response.ok) {
      const errorMsg =
        parsedData?.message ||
        parsedData?.title ||
        parsedData?.error ||
        `Device registration failed with status code ${response.status}.`;
      throw new Error(errorMsg);
    }

    return (
      parsedData || {
        success: true,
        message: "Device registered successfully.",
        data: requestBody,
      }
    );
  }
}

/**
 * Singleton instance of the Device Service.
 */
export const deviceService = new DeviceService();
