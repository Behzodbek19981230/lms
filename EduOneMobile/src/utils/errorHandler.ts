import { Alert } from 'react-native';

export const handleApiError = (
  error: any,
  defaultMessage = 'Xatolik yuz berdi',
) => {
  let message = defaultMessage;

  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;

    switch (status) {
      case 400:
        message = data.message || "Noto'g'ri so'rov yuborildi";
        break;
      case 401:
        message = 'Avtorizatsiya talab qilinadi. Iltimos, tizimga kiring';
        break;
      case 403:
        message = "Ruxsat etilmagan. Sizda bu amalni bajarish huquqi yo'q";
        break;
      case 404:
        message = "So'ralgan resurs topilmadi";
        break;
      case 409:
        message = data.message || "Ma'lumotlar to'qnashuvi";
        break;
      case 500:
        message = "Server xatosi. Iltimos, keyinroq urinib ko'ring";
        break;
      default:
        message = data.message || defaultMessage;
    }
  } else if (error.request) {
    // Request was made but no response received
    message = 'Tarmoq xatosi. Internet aloqangizni tekshiring';
  } else {
    // Something else happened
    message = error.message || defaultMessage;
  }

  Alert.alert('Xatolik', message);
  return message;
};

export const showSuccessMessage = (message: string) => {
  Alert.alert('Muvaffaqiyat', message);
};
