import type { NavigatorScreenParams } from '@react-navigation/native';

import type { SaverKey } from './index';

export type MainTabParamList = {
  Today: undefined;
  Insights: undefined;
  History: { dateKey?: string } | undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Timer: { dateKey: string; activityId: SaverKey };
};

declare global {
  namespace ReactNavigation {
    // The navigation package requires declaration merging with an interface.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
