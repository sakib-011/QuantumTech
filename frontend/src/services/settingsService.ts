import { StoreSettings } from '../types';
import { defaultStoreSettings } from '../data/seedData';
import { getItem, setItem, STORAGE_KEYS } from '../utilities/storage';
import { syncSettings } from './backend';

export const settingsService = {
  getSettings(): StoreSettings {
    const saved = getItem<StoreSettings>(STORAGE_KEYS.SETTINGS, defaultStoreSettings);
    return { ...defaultStoreSettings, ...saved };
  },

  async saveSettings(newSettings: StoreSettings): Promise<StoreSettings> {
    const savedSettings = await syncSettings(newSettings);
    setItem(STORAGE_KEYS.SETTINGS, savedSettings);
    window.dispatchEvent(new Event('quantum_settings_updated'));
    return savedSettings;
  },
};
