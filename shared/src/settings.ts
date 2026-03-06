export interface StimulusSettings {
  controllersDirs: string[];
  fileWatchPattern: string;
  activationLanguages: string[];
}
export const defaultSettings: StimulusSettings = {
  controllersDirs: ['./app/controllers'],
  fileWatchPattern: '**/*_controller.{ts,js}',
  activationLanguages: ['html'],
};

export const LSP_ID = 'stimulus';
