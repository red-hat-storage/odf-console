import { useTranslation } from 'react-i18next';

export const NS = process.env.I8N_NS;

export const useCustomTranslation = () => useTranslation(NS);
