// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import dropRepeatsByKeys from 'xstream-drop-repeats-by-keys';
import {ReactSource} from '@cycle/react';
import {HTTPSource} from '@cycle/http';
import {t} from '../../drivers/localization';
import {DialogSource} from '../../drivers/dialogs';
import {Palette} from '../../global-styles/palette';
import {State} from './model';

type TabID = State['currentTab'];

export default function intent(
  reactSource: ReactSource,
  dialogSource: DialogSource,
  httpSource: HTTPSource,
  state$: Stream<State>,
) {
  const changeTab$ = xs.merge(
    reactSource
      .select('home-tab-button')
      .events('press')
      .mapTo('home' as TabID),

    reactSource
      .select('messages-tab-button')
      .events('press')
      .mapTo('messages' as TabID),

    reactSource
      .select('contacts-tab-button')
      .events('press')
      .mapTo('contacts' as TabID),

    reactSource
      .select('discover-tab-button')
      .events('press')
      .mapTo('discover' as TabID),

    reactSource
      .select('profiles-tab-button')
      .events('press')
      .mapTo('profiles' as TabID),
  );

  const changeTabWithState$ = changeTab$.compose(sampleCombine(state$));

  const scrollToTop$ = changeTabWithState$
    .filter(([nextTab, state]) => nextTab === state.currentTab)
    .map(([nextTab]) => nextTab);

  const goToSelfProfile$ = reactSource
    .select('self-profile')
    .events('press')
    .mapTo(null);

  const goToSettings$ = reactSource
    .select('settings')
    .events('press')
    .mapTo(null);

  const openMoreMenuOptions$ = reactSource
    .select('more')
    .events('press')
    .map(() =>
      dialogSource.showPicker(undefined, undefined, {
        items: [
          {
            id: 'raw-db',
            label: t('drawer.menu.raw_database.label'),
          },
          {
            id: 'bug-report',
            label: t('drawer.menu.email_bug_report.label'),
          },
          {
            id: 'translate',
            label: t('drawer.menu.translate.label'),
          },
        ],
        type: 'listPlain',
        ...Palette.listDialogColors,
        cancelable: true,
        positiveText: '',
        negativeText: '',
        neutralText: '',
      }),
    )
    .flatten()
    .filter((res) => res.action === 'actionSelect')
    .map(
      (res: any) =>
        res.selectedItem.id as 'raw-db' | 'bug-report' | 'translate',
    );

  const showRawDatabase$ = openMoreMenuOptions$.filter((id) => id === 'raw-db');

  const emailBugReport$ = openMoreMenuOptions$.filter(
    (id) => id === 'bug-report',
  );

  const openTranslate$ = openMoreMenuOptions$.filter(
    (id) => id === 'translate',
  );

  const checkNewVersion$ = state$
    .compose(dropRepeatsByKeys(['allowCheckingNewVersion']))
    .filter((s) => s.allowCheckingNewVersion === true)
    .map(() => xs.periodic(1000 * 60 * 60 * 24).startWith(0))
    .flatten();

  const response$ = httpSource
    .select('latestversion')
    .flatten()
    .map((res) => res.body);

  const latestVersionResponse$ = response$.replaceError(() => response$);

  const downloadNewVersion$ = reactSource
    .select('new-version')
    .events('press')
    .mapTo(null);

  return {
    changeTab$,
    scrollToTop$,
    goToSelfProfile$,
    goToSettings$,
    showRawDatabase$,
    emailBugReport$,
    openTranslate$,
    checkNewVersion$,
    latestVersionResponse$,
    downloadNewVersion$,
  };
}
