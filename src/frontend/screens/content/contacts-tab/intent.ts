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
  ContactChangeTab,
  ContactScrollToTop,
  ContactScreenUpdate,
} from '../../../drivers/eventbus';
import sample from 'xstream-sample';

type TabID = State['currentTab'];

export default function intent(
  reactSource: ReactSource,
  globalEventBus: Stream<GlobalEvent>,
  state$: Stream<State>,
) {
  const contactScreenUpdate$ = globalEventBus.filter(
    (event) => event.type === 'contactScreenUpdate',
  ) as Stream<ContactScreenUpdate>;

  const changeTab$ = xs.merge(
    contactScreenUpdate$
      .filter((event) => event.subtype === 'changeTab')
      .map((event) => (event as ContactChangeTab).tab),

    reactSource
      .select('activity-tab-button')
      .events('press')
      .mapTo('activity' as TabID),

    reactSource
      .select('connections-tab-button')
      .events('press')
      .mapTo('connections' as TabID),
  );

  const globalScrollToTop$ = contactScreenUpdate$
    .filter((event) => event.subtype === 'scrollToTop')
    .map((event) => (event as ContactScrollToTop).tab);

  const changeTabWithState$ = changeTab$.compose(sampleCombine(state$));

  const scrollToActivityTop$ = xs.merge(
    changeTabWithState$
      .filter(
        ([nextTab, state]) =>
          state.currentTab === 'activity' && nextTab === 'activity',
      )
      .mapTo(null),

    globalScrollToTop$.filter((tab) => tab === 'connections').mapTo(null),
  );

  const hardwareBackWithState$ = globalEventBus
    .filter((event) => event.type === 'hardwareBackOnCentralScreen')
    .compose(sample(state$));

  const closeDrawer$ = hardwareBackWithState$
    .filter((state) => state.isDrawerOpen)
    .mapTo(null);

  const drawerToggled$ = globalEventBus
    .filter(
      (event): event is DrawerToggleOnCentralScreen =>
        event.type === 'drawerToggleOnCentralScreen',
    )
    .map((event) => event.open);

  return {
    changeTab$,
    scrollToActivityTop$,
    closeDrawer$,
    drawerToggled$,
  };
}
