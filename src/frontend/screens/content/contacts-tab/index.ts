// SPDX-FileCopyrightText: 2018-2021 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import {StateSource, Reducer} from '@cycle/state';
import {ReactElement} from 'react';
import isolate from '@cycle/isolate';
import {ReactSource} from '@cycle/react';
import {AsyncStorageSource} from 'cycle-native-asyncstorage';
import {Command, NavSource} from 'cycle-native-navigation';
import {State as AppState} from '../../../drivers/appstate';
import {NetworkSource} from '../../../drivers/network';
import {SSBSource} from '../../../drivers/ssb';
import {GlobalEvent} from '../../../drivers/eventbus';
import {DialogSource} from '../../../drivers/dialogs';
import {WindowSize} from '../../../drivers/window-size';
import {activityTab, Sinks as ActivityTabSinks} from './activity-tab/index';
import {
  connectionsTab,
  Sinks as ConnectionsTabSinks,
} from './connections-tab/index';
import intent from './intent';
import model, {State, activityTabLens, connectionsTabLens} from './model';
import view from './view';
import navigation from './navigation';

export interface Sources {
  screen: ReactSource;
  navigation: NavSource;
  globalEventBus: Stream<GlobalEvent>;
  asyncstorage: AsyncStorageSource;
  appstate: Stream<AppState>;
  network: NetworkSource;
  state: StateSource<State>;
  dialog: DialogSource;
  ssb: SSBSource;
  windowSize: Stream<WindowSize>;
}

export interface Sinks {
  screen: Stream<ReactElement<any>>;
  navigation: Stream<Command>;
  state: Stream<Reducer<any>>;
  linking: Stream<string>;
  globalEventBus: Stream<GlobalEvent>;
}

export const navOptions = {
  topBar: {
    visible: false,
    drawBehind: true,
    hideOnScroll: false,
    animate: false,
    borderHeight: 0,
    elevation: 0,
    height: 0,
  },
  sideMenu: {
    left: {
      enabled: true,
    },
  },
};

export function contactsTab(sources: Sources): Sinks {
  const state$ = sources.state.stream;

  const actions = intent(sources.screen, sources.globalEventBus, state$);

  const fabPress$: Stream<string> = sources.screen
    .select('fab')
    .events('pressItem');

  const activityTabSinks = isolate(activityTab, {
    state: activityTabLens,
    '*': 'activityTab',
  })({
    ...sources,
    scrollToTop: actions.scrollToActivityTop$,
  }) as ActivityTabSinks;

  const connectionsTabSinks = isolate(connectionsTab, {
    state: connectionsTabLens,
    '*': 'connectionsTab',
  })({...sources, fab: fabPress$}) as ConnectionsTabSinks;

  const fabProps$ = state$.map((state) => connectionsTabSinks.fab).flatten();

  const command$ = navigation(
    state$,
    {
      closeDrawer$: actions.closeDrawer$,
    },
    xs.merge(activityTabSinks.navigation, connectionsTabSinks.navigation),
  );

  const centralReducer$ = model(actions, sources.ssb);

  const reducer$ = xs.merge(
    centralReducer$,
    activityTabSinks.state,
    connectionsTabSinks.state,
  ) as Stream<Reducer<State>>;

  const vdom$ = view(
    state$,
    fabProps$,
    activityTabSinks.screen,
    connectionsTabSinks.screen,
  );

  const globalEvent$ = xs.merge(
    state$
      .map((state) => state.numOfActivityUpdates)
      .compose(dropRepeats())
      .map(
        (counter) =>
          ({
            type: 'contactScreenUpdate',
            subtype: 'activityUpdates',
            counter,
          } as GlobalEvent),
      ),

    state$
      .map((state) => state.connectionsTab)
      .compose(dropRepeats())
      .map(
        (substate) =>
          ({
            type: 'contactScreenUpdate',
            subtype: 'connectionsUpdates',
          } as GlobalEvent),
      ),
  );

  return {
    screen: vdom$,
    state: reducer$,
    navigation: command$,
    linking: connectionsTabSinks.linking,
    globalEventBus: globalEvent$,
  };
}
