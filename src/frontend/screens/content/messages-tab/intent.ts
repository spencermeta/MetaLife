// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import {ReactSource} from '@cycle/react';
import {State} from './model';
import {
  GlobalEvent,
  DrawerToggleOnCentralScreen,
  MessageChangeTab,
  MessageScreenUpdate,
} from '../../../drivers/eventbus';
import sample from 'xstream-sample';

type TabID = State['currentTab'];

export default function intent(
  reactSource: ReactSource,
  globalEventBus: Stream<GlobalEvent>,
  state$: Stream<State>,
) {
  const messageScreenUpdate = globalEventBus.filter(
    (event) => event.type === 'messageScreenUpdate',
  ) as Stream<MessageScreenUpdate>;

  const changeTab$ = xs.merge(
    messageScreenUpdate
      .filter((event) => event.subtype === 'changeTab')
      .map((event) => (event as MessageChangeTab).tab),

    reactSource
      .select('public-tab-button')
      .events('press')
      .mapTo('public' as TabID),

    reactSource
      .select('private-tab-button')
      .events('press')
      .mapTo('private' as TabID),
  );

  const globalScrollToTop$ = messageScreenUpdate
    .filter((event) => event.subtype === 'scrollToTop')
    .map((event) => (event as MessageChangeTab).tab);

  const changeTabWithState$ = changeTab$.compose(sampleCombine(state$));

  const scrollToPublicTop$ = xs.merge(
    changeTabWithState$
      .filter(
        ([nextTab, state]) =>
          state.currentTab === 'public' && nextTab === 'public',
      )
      .mapTo(null),

    globalScrollToTop$.filter((tab) => tab === 'public').mapTo(null),
  );

  const scrollToPrivateTop$ = xs.merge(
    changeTabWithState$
      .filter(
        ([nextTab, state]) =>
          state.currentTab === 'private' && nextTab === 'private',
      )
      .mapTo(null),

    globalScrollToTop$.filter((tab) => tab === 'public').mapTo(null),
  );

  const hardwareBackWithState$ = globalEventBus
    .filter((event) => event.type === 'hardwareBackOnCentralScreen')
    .compose(sample(state$));

  const closeDrawer$ = hardwareBackWithState$
    .filter((state) => state.isDrawerOpen)
    .mapTo(null);

  const backToPublicTab$ = hardwareBackWithState$
    .filter((state) => !state.isDrawerOpen && state.currentTab !== 'public')
    .mapTo(null);

  const exitApp$ = hardwareBackWithState$
    .filter((state) => !state.isDrawerOpen && state.currentTab === 'public')
    .mapTo(null);

  const drawerToggled$ = globalEventBus
    .filter(
      (event): event is DrawerToggleOnCentralScreen =>
        event.type === 'drawerToggleOnCentralScreen',
    )
    .map((event) => event.open);

  return {
    changeTab$,
    scrollToPublicTop$,
    scrollToPrivateTop$,
    closeDrawer$,
    backToPublicTab$,
    exitApp$,
    drawerToggled$,
  };
}
