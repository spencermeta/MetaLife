// SPDX-FileCopyrightText: 2018-2021 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import {StateSource, Reducer} from '@cycle/state';
import {ReactElement} from 'react';
import isolate from '@cycle/isolate';
import {ReactSource} from '@cycle/react';
import {
  AsyncStorageSource,
  Command as StorageCommand,
} from 'cycle-native-asyncstorage';
import {Command, NavSource} from 'cycle-native-navigation';
import {Toast} from '../../../drivers/toast';
import {State as AppState} from '../../../drivers/appstate';
import {NetworkSource} from '../../../drivers/network';
import {SSBSource, Req} from '../../../drivers/ssb';
import {GlobalEvent} from '../../../drivers/eventbus';
import {DialogSource} from '../../../drivers/dialogs';
import {WindowSize} from '../../../drivers/window-size';
import {publicTab, Sinks as PublicTabSinks} from './public-tab/index';
import {privateTab, Sinks as PrivateTabSinks} from './private-tab/index';
import intent from './intent';
import model, {State, publicTabLens, privateTabLens} from './model';
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
  asyncstorage: Stream<StorageCommand>;
  state: Stream<Reducer<any>>;
  ssb: Stream<Req>;
  clipboard: Stream<string>;
  toast: Stream<Toast>;
  globalEventBus: Stream<GlobalEvent>;
  exit: Stream<any>;
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

export function messagesTab(sources: Sources): Sinks {
  const state$ = sources.state.stream;

  const actions = intent(sources.screen, sources.globalEventBus, state$);

  const fabPress$: Stream<string> = sources.screen
    .select('fab')
    .events('pressItem');

  const publicTabSinks = isolate(publicTab, {
    state: publicTabLens,
    '*': 'publicTab',
  })({
    ...sources,
    fab: fabPress$,
    scrollToTop: actions.scrollToPublicTop$,
  }) as PublicTabSinks;

  const privateTabSinks = isolate(privateTab, {
    state: privateTabLens,
    '*': 'privateTab',
  })({
    ...sources,
    fab: fabPress$,
    scrollToTop: actions.scrollToPrivateTop$,
  }) as PrivateTabSinks;

  const fabProps$ = state$
    .map((state) =>
      state.currentTab === 'public'
        ? publicTabSinks.fab
        : state.currentTab === 'private'
        ? privateTabSinks.fab
        : publicTabSinks.fab,
    )
    .flatten();

  const command$ = navigation(
    state$,
    {
      closeDrawer$: actions.closeDrawer$,
    },
    xs.merge(publicTabSinks.navigation, privateTabSinks.navigation),
  );

  const centralReducer$ = model(actions, sources.ssb);

  const reducer$ = xs.merge(
    centralReducer$,
    publicTabSinks.state,
    privateTabSinks.state,
  ) as Stream<Reducer<State>>;

  const vdom$ = view(
    state$,
    fabProps$,
    publicTabSinks.screen,
    privateTabSinks.screen,
  );

  const toast$ = xs.merge(publicTabSinks.toast);

  const ssb$ = xs.merge(publicTabSinks.ssb);

  const storageCommand$ = publicTabSinks.asyncstorage;

  const globalEvent$ = xs.merge(
    state$
      .map((state) => state.numOfPublicUpdates)
      .compose(dropRepeats())
      .map(
        (counter) =>
          ({
            type: 'messageScreenUpdate',
            subtype: 'publicUpdates',
            counter,
          } as GlobalEvent),
      ),

    state$
      .map((state) => state.numOfPrivateUpdates)
      .compose(dropRepeats())
      .map(
        (counter) =>
          ({
            type: 'messageScreenUpdate',
            subtype: 'privateUpdates',
            counter,
          } as GlobalEvent),
      ),
  );

  return {
    screen: vdom$,
    state: reducer$,
    navigation: command$,
    asyncstorage: storageCommand$,
    ssb: ssb$,
    clipboard: publicTabSinks.clipboard,
    toast: toast$,
    globalEventBus: globalEvent$,
    exit: actions.exitApp$,
  };
}
