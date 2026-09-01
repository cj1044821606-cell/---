import { axiosForBackend } from "@client/src/lib/api-client";
import type {
  MyHandledResponse,
  MyReceivedResponse,
  MySubscribedResponse,
} from "@shared/api.interface";

export async function getMyReceived(): Promise<MyReceivedResponse> {
  const response = await axiosForBackend({
    url: "/api/my/received",
    method: "GET",
  });
  return response.data as MyReceivedResponse;
}

export async function getMySubscribed(): Promise<MySubscribedResponse> {
  const response = await axiosForBackend({
    url: "/api/my/subscribed",
    method: "GET",
  });
  return response.data as MySubscribedResponse;
}

export async function getMyHandled(): Promise<MyHandledResponse> {
  const response = await axiosForBackend({
    url: "/api/my/handled",
    method: "GET",
  });
  return response.data as MyHandledResponse;
}
