import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Default to localhost, change to 10.0.2.2 if testing on Android Emulator
// const BASE_URL = 'https://agrindus.appaurica.one/';
const BASE_URL = 'https://46ae-189-100-68-80.ngrok-free.app';
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export default apiClient;
