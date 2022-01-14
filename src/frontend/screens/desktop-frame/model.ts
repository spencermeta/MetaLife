// SPDX-FileCopyrightText: 2021-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import {FeedId} from 'ssb-typescript';
import {Reducer} from '@cycle/state';
import {SSBSource} from '../../drivers/ssb';
import {GlobalEvent} from '../../drivers/eventbus';
import progressCalculation, {
  State as ProgressState,
  INITIAL_STATE as INITIAL_PROGRESS_STATE,
} from '../../components/progressCalculation';
import currentVersion from '../../versionName';

export interface State extends ProgressState {
  selfFeedId: FeedId;
  selfAvatarUrl?: string;
  name?: string;
  currentTab: 'home' | 'messages' | 'contacts' | 'discover' | 'profiles';
  allowCheckingNewVersion: boolean;
  hasNewVersion: boolean;
}

interface Actions {
  changeTab$: Stream<State['currentTab']>;
  latestVersionResponse$: Stream<string>;
}

export default function model(
  actions: Actions,
  globalEventBus: Stream<GlobalEvent>,
  ssbSource: SSBSource,
) {
  const selfFeedId$ = ssbSource.selfFeedId$.take(1);

  const selfFeedIdReducer$ = selfFeedId$.map(
    (selfFeedId: FeedId) =>
      function selfFeedIdReducer(prev: State): State {
        if (!prev) {
          return {
            selfFeedId,
            currentTab: 'home',
            allowCheckingNewVersion: false,
            hasNewVersion: false,
            ...INITIAL_PROGRESS_STATE,
          };
        } else {
          return {...prev, selfFeedId};
        }
      },
  );

  const aboutReducer$ = selfFeedId$
    .map((selfFeedId) => ssbSource.profileAboutLive$(selfFeedId))
    .flatten()
    .map(
      (about) =>
        function aboutReducer(prev: State): State {
          let name;
          if (!!about.name && about.name !== about.id) {
            name = about.name;
          }
          if (!prev) {
            return {
              selfFeedId: about.id,
              selfAvatarUrl: about.imageUrl,
              currentTab: 'messages',
              allowCheckingNewVersion: false,
              hasNewVersion: false,
              ...INITIAL_PROGRESS_STATE,
            };
          } else {
            return {
              ...prev,
              selfAvatarUrl: about.imageUrl,
              name,
            };
          }
        },
    );

  const changeTabReducer$ = actions.changeTab$.map(
    (nextTab) =>
      function changeTabReducer(prev: State): State {
        return {...prev, currentTab: nextTab};
      },
  );

  const readSettingsReducer$ = ssbSource.readSettings().map(
    (settings) =>
      function readSettingsReducer(prev: State): State {
        return {
          ...prev,
          allowCheckingNewVersion: settings.allowCheckingNewVersion ?? false,
        };
      },
  );

  const allowCheckingNewVersionReducer$ = globalEventBus
    .filter((ev) => ev.type === 'approveCheckingNewVersion')
    .map(
      () =>
        function allowCheckingNewVersionReducer(prev: State): State {
          return {...prev, allowCheckingNewVersion: true};
        },
    );

  const hasNewVersionReducer$ = actions.latestVersionResponse$
    .map((latestVersion) => {
      const [majorPrev, minorPrev, restPrev] = currentVersion.split('.');
      const [majorNext, minorNext, restNext] = latestVersion.split('.');
      const patchPrev = restPrev.split('-')[0];
      const patchNext = restNext.split('-')[0];
      if (majorNext > majorPrev) return true;
      if (minorNext > minorPrev) return true;
      if (patchNext > patchPrev) return true;
      return false;
    })
    .map(
      (hasNewVersion) =>
        function hasNewVersionReducer(prev: State): State {
          return {...prev, hasNewVersion};
        },
    );

  const progressReducer$ = progressCalculation(ssbSource) as Stream<
    Reducer<State>
  >;

  return xs.merge(
    selfFeedIdReducer$,
    aboutReducer$,
    changeTabReducer$,
    readSettingsReducer$,
    allowCheckingNewVersionReducer$,
    hasNewVersionReducer$,
    progressReducer$,
  );
}
