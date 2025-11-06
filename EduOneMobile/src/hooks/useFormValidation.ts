import { useState } from 'react';

interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => boolean;
}

interface FieldConfig {
  value: string;
  rules: ValidationRules;
  label: string;
}

export const useFormValidation = (fields: Record<string, FieldConfig>) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (fieldName: string, value: string): string => {
    const field = fields[fieldName];
    if (!field) return '';

    const { rules, label } = field;

    // Required validation
    if (rules.required && !value.trim()) {
      return `${label} maydoni majburiy`;
    }

    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
      return `${label} kamida ${rules.minLength} belgidan iborat bo'lishi kerak`;
    }

    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
      return `${label} ko'pi bilan ${rules.maxLength} belgidan iborat bo'lishi kerak`;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      return `${label} noto'g'ri formatda`;
    }

    // Custom validation
    if (rules.custom && !rules.custom(value)) {
      return `${label} noto'g'ri`;
    }

    return '';
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const error = validateField(fieldName, field.value);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const clearErrors = () => {
    setErrors({});
  };

  const clearError = (fieldName: string) => {
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  return {
    errors,
    validateField,
    validateForm,
    clearErrors,
    clearError,
  };
};
