import axios from "axios";
import Toastify from "toastify-js";
const defaultHeaders = {
  "Content-Type": "application/json",
};

export const getError = (e) => {
  return e.response.data ? e.response.data.message : e.message;
};

export const doGet = async (route, headers, mockResponse, config) => {
  try {
    defaultHeaders.Authorization = localStorage.getItem("token");
    return (
      await axios({
        method: "GET",
        url: route,
        headers: { ...defaultHeaders, ...headers },
        ...config,
      })
    ).data.data;
  } catch (e) {
    if (mockResponse) {
      return mockResponse;
    }
    throw e;
  }
};
export const doDelete = async (route, headers, mockResponse) => {
  try {
    defaultHeaders.Authorization = localStorage.getItem("token");
    return (
      await axios({
        method: "DELETE",
        url: route,
        headers: { ...defaultHeaders, ...headers },
      })
    ).data;
  } catch (e) {
    if (mockResponse) {
      return mockResponse;
    }
    throw e;
  }
};
export const doPost = async (route, headers, payload, mockResponse) => {
  try {
    defaultHeaders.Authorization = localStorage.getItem("token");
    return (
      await axios({
        method: "POST",
        url: route,
        headers: { ...defaultHeaders, ...headers },
        data: payload,
      })
    ).data;
  } catch (e) {
    if (mockResponse) {
      return mockResponse;
    }
    throw e;
  }
};
export const doPut = async (route, headers, payload, mockResponse) => {
  try {
    defaultHeaders.Authorization = localStorage.getItem("token");
    return (
      await axios({
        method: "PUT",
        url: route,
        headers: { ...defaultHeaders, ...headers },
        data: payload,
      })
    ).data;
  } catch (e) {
    if (mockResponse) {
      return mockResponse;
    }
    throw e;
  }
};
export function showMessage(msg, severity, duration) {
  let t = Toastify({
    text: msg,
    duration: duration || 5000,
    close: false,
    gravity: "bottom",
    position: "left",
    stopOnFocus: true,
    className: severity || "info",
    onClick: function () {
      t.hideToast();
    },
  });
  t.showToast();
}

export const SERVICE_API = "https://proconvn.duckdns.org";
export const GAME_API = "https://procon2023.duckdns.org";
