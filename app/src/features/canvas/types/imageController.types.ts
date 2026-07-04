export interface ImageControllerState {
  toggles: ImageControllerToggles;
  time: TimePreferenceId | null;
  lightDirection: LightDirectionPreferenceId | null;
  weather: WeatherPreferenceId | null;
  season: SeasonPreferenceId | null;
  style: StylePreferenceId | null;
}

export interface ImageControllerToggles {
  addEnvironment: boolean;
  addPeople: boolean;
  indoorLighting: boolean;
  motionBlur: boolean;
}

export type TimePreferenceId = 'sunrise' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night';
export type LightDirectionPreferenceId = 'front_light' | 'left_side_light' | 'right_side_light' | 'back_light' | 'diffused_light';
export type WeatherPreferenceId = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'foggy';
export type SeasonPreferenceId = 'spring' | 'summer' | 'autumn' | 'winter';
export type StylePreferenceId = 'photo_realistic' | 'nordic_atmosphere' | 'conceptual_drama' | 'premium_real_estate' | 'painterly_expression';
