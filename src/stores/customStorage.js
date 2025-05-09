import AsyncStorage from 'redux-persist/lib/storage'; // This is the default storage for web
import CryptoJS from 'crypto-js';

// Use a secure key in a production environment
const secretKey = 'kFKMulFHYH6MngAHcXLosHpKuEQmTErJ'; 

// Function to encrypt data
const encrypt = (data) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
};

// Function to decrypt data
const decrypt = (data) => {
  const bytes = CryptoJS.AES.decrypt(data, secretKey);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

// Custom storage for Redux Persist
const customStorage = {
  setItem: (key, value) => {
    return AsyncStorage.setItem(key, encrypt(value));
  },
  getItem: (key) => {
    return AsyncStorage.getItem(key).then((value) => {
      if (value) {
        return decrypt(value);
      }
      return null;
    });
  },
  removeItem: (key) => {
    return AsyncStorage.removeItem(key);
  },
};

export default customStorage