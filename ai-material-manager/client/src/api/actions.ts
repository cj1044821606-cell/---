import { axiosForBackend } from "@client/src/lib/api-client";
import type {
  FeedbackActionRequest,
  FeedbackActionResponse,
  ReceiveActionResponse,
  ReceiveBatchActionResponse,
  RetireActionRequest,
  RetireActionResponse,
  RestoreActionRequest,
  RestoreActionResponse,
  SubscribeActionResponse,
} from "@shared/material";

export async function receiveMaterial(
  materialId: string,
): Promise<ReceiveActionResponse> {
  const response = await axiosForBackend({
    url: "/api/actions/receive",
    method: "POST",
    data: { materialId },
  });
  return response.data as ReceiveActionResponse;
}

export async function receiveMaterialBatch(
  materialIds: string[],
): Promise<ReceiveBatchActionResponse> {
  const response = await axiosForBackend({
    url: "/api/actions/receive-batch",
    method: "POST",
    data: { materialIds },
  });
  return response.data as ReceiveBatchActionResponse;
}

export async function setMaterialSubscription(
  materialId: string,
  subscribe: boolean,
): Promise<SubscribeActionResponse> {
  const response = await axiosForBackend({
    url: "/api/actions/subscribe",
    method: "POST",
    data: { materialId, subscribe },
  });
  return response.data as SubscribeActionResponse;
}

export async function submitProblemFeedback(
  input: FeedbackActionRequest,
): Promise<FeedbackActionResponse> {
  const response = await axiosForBackend({
    url: "/api/actions/feedback",
    method: "POST",
    data: input,
  });
  return response.data as FeedbackActionResponse;
}

export async function retireMaterial(
  input: RetireActionRequest,
): Promise<RetireActionResponse> {
  const response = await axiosForBackend({
    url: "/api/actions/retire",
    method: "POST",
    data: input,
  });
  return response.data as RetireActionResponse;
}

export async function restoreMaterial(
  input: RestoreActionRequest,
): Promise<RetireActionResponse> {
  const response = await axiosForBackend({
    url: "/api/actions/restore",
    method: "POST",
    data: input,
  });
  return response.data as RetireActionResponse;
}
