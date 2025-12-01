import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { debugError, debugLog, debugWarn } from "../utils/debug";
import { api } from "./commons";

/**
 * Query key factory for answers
 * This ensures consistent cache keys across the app
 */
export const answerKeys = {
  all: ["answers"],
  lists: () => [...answerKeys.all, "list"],
  list: (roundId, filters = {}, pagination = {}) => [
    ...answerKeys.lists(),
    roundId,
    filters,
    pagination,
  ],
  details: () => [...answerKeys.all, "detail"],
  detail: (id) => [...answerKeys.details(), id],
};

/**
 * Fetch answers with filters and pagination
 * @param {string} roundId - Round ID to filter by
 * @param {object} filters - Additional filters (team, match, question, score, etc.)
 * @param {object} pagination - Pagination params { page, limit }
 * @returns {Promise} API response with pagination metadata
 */
const fetchAnswers = async (roundId, filters = {}, pagination = {}) => {
  const params = {
    "match[eq_round_id]": roundId,
  };

  // Add pagination params
  if (pagination.page !== undefined) {
    params.page = pagination.page;
  }
  if (pagination.limit !== undefined) {
    params.limit = pagination.limit;
  }

  // Add column filters
  Object.keys(filters).forEach((key) => {
    if (filters[key]) {
      // Handle nested fields (team, match, question)
      if (key === "team") {
        params["match[like_team_name]"] = filters[key];
      } else if (key === "match") {
        params["match[like_match_name]"] = filters[key];
      } else if (key === "question") {
        params["match[like_question_name]"] = filters[key];
      } else {
        // For simple fields (score, step, resub_count, etc.)
        params[`match[like_${key}]`] = filters[key];
      }
    }
  });

  debugLog("📡 Fetching answers with params:", params);

  try {
    const response = await api.get(`${import.meta.env.VITE_SERVICE_API}/answer`, { params });

    // api.get() already returns response.data due to interceptor (commons.js line 29)
    // Backend response format: { count, data, page, limit, totalPages }
    debugLog("📦 API Response:", response);

    // Return full response with pagination metadata
    if (response && response.data) {
      return {
        data: response.data, // Array of answers
        count: response.count || 0,
        page: response.page || 0,
        limit: response.limit || 50,
        totalPages: response.totalPages || 0,
      };
    }

    // If response doesn't have expected format, return empty result
    debugWarn("⚠️ Unexpected API response format:", response);
    return {
      data: [],
      count: 0,
      page: 0,
      limit: 50,
      totalPages: 0,
    };
  } catch (error) {
    debugError("❌ Error fetching answers:", error);
    // React Query expects a value, not undefined
    // Return empty result on error
    return {
      data: [],
      count: 0,
      page: 0,
      limit: 50,
      totalPages: 0,
    };
  }
};

/**
 * Hook to fetch answers with React Query
 * Automatically handles caching, refetching, and loading states
 *
 * @param {string} roundId - Round ID
 * @param {object} filters - Filter object { team: "UET", score: "100", ... }
 * @param {object} pagination - Pagination object { page: 0, limit: 50 }
 * @param {object} options - React Query options
 * @returns {object} { data, isLoading, error, refetch }
 */
export const useAnswers = (roundId, filters = {}, pagination = {}, options = {}) => {
  return useQuery({
    queryKey: answerKeys.list(roundId, filters, pagination),
    queryFn: () => fetchAnswers(roundId, filters, pagination),
    enabled: !!roundId, // Only run if roundId exists
    ...options,
  });
};

/**
 * Hook to create a new answer
 * Automatically invalidates answer cache after creation
 */
export const useCreateAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.post(`${import.meta.env.VITE_SERVICE_API}/answer`, data),
    onSuccess: () => {
      // Invalidate all answer queries to refetch
      queryClient.invalidateQueries({ queryKey: answerKeys.all });
    },
  });
};

/**
 * Hook to update an answer
 * Automatically invalidates answer cache after update
 */
export const useUpdateAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.put(`${import.meta.env.VITE_SERVICE_API}/answer/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: answerKeys.all });
    },
  });
};

/**
 * Hook to delete an answer
 * Automatically invalidates answer cache after deletion
 */
export const useDeleteAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.delete(`${import.meta.env.VITE_SERVICE_API}/answer/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: answerKeys.all });
    },
  });
};

/**
 * Hook to manually invalidate answer cache
 * Useful for refresh buttons
 */
export const useInvalidateAnswers = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: answerKeys.all });
  };
};

