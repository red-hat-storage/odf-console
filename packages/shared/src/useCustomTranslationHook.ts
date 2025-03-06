import { PLUGIN_I18N_NS } from '@odf/shared/constants/common';
import { useTranslation } from 'react-i18next';

export const useCustomTranslation = () => useTranslation(PLUGIN_I18N_NS);
