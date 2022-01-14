// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import {Reducer, Lens} from '@cycle/state';
import {Animated} from 'react-native';
import {FeedId, MsgId} from 'ssb-typescript';
import {State as PublicTabState} from './public-tab/model';
import {State as PrivateTabState} from './private-tab/model';
import {SSBSource} from '../../../drivers/ssb';

export interface State {
  selfFeedId: FeedId;
  lastSessionTimestamp: number;
  selfAvatarUrl?: string;
  currentTab: 'public' | 'private';
  scrollHeaderBy: Animated.Value;
  publicTab?: PublicTabState;
  privateTab?: PrivateTabState;
  initializedSSB: boolean;
  numOfPublicUpdates: number;
  numOfPrivateUpdates: number;
  migrationProgress: number;
  indexingProgress: number;
  canPublishSSB: boolean;
  isDrawerOpen: boolean;
}

/**
 * Identity lens
 */
export const publicTabLens: Lens<State, PublicTabState> = {
  get: (parent: State): PublicTabState => {
    const isVisible = parent.currentTab === 'public';
    const {selfFeedId, selfAvatarUrl, canPublishSSB} = parent;
    if (parent.publicTab) {
      return {
        ...parent.publicTab,
        isVisible,
        selfFeedId,
        selfAvatarUrl,
        canPublishSSB,
      };
    } else {
      return {
        isVisible,
        selfFeedId,
        lastSessionTimestamp: parent.lastSessionTimestamp,
        preferredReactions: [],
        selfAvatarUrl,
        getPublicFeedReadable: null,
        numOfUpdates: parent.numOfPublicUpdates,
        initializedSSB: parent.initializedSSB,
        hasComposeDraft: false,
        canPublishSSB,
        scrollHeaderBy: parent.scrollHeaderBy,
      };
    }
  },

  set: (parent: State, child: PublicTabState): State => {
    return {
      ...parent,
      initializedSSB: child.initializedSSB,
      numOfPublicUpdates: child.numOfUpdates,
      lastSessionTimestamp: child.lastSessionTimestamp,
      publicTab: child,
    };
  },
};

export const privateTabLens: Lens<State, PrivateTabState> = {
  get: (parent: State): PrivateTabState => {
    const isVisible = parent.currentTab === 'private';
    const {selfFeedId, selfAvatarUrl} = parent;
    if (parent.privateTab) {
      return {...parent.privateTab, isVisible, selfFeedId, selfAvatarUrl};
    } else {
      return {
        isVisible,
        selfFeedId,
        selfAvatarUrl,
        getPrivateFeedReadable: null,
        updates: new Set<MsgId>(),
        updatesFlag: false,
        conversationsOpen: new Map(),
      };
    }
  },

  set: (parent: State, child: PrivateTabState): State => {
    return {
      ...parent,
      numOfPrivateUpdates: child.updates.size,
      privateTab: child,
    };
  },
};

export interface Actions {
  changeTab$: Stream<State['currentTab']>;
  backToPublicTab$: Stream<null>;
  drawerToggled$: Stream<boolean>;
}

export default function model(
  actions: Actions,
  ssbSource: SSBSource,
): Stream<Reducer<State>> {
  const initReducer$ = xs.of(function initReducer(prev?: State): State {
    if (prev) {
      return prev;
    } else {
      return {
        selfFeedId: '',
        lastSessionTimestamp: Infinity,
        currentTab: 'public',
        numOfPublicUpdates: 0,
        numOfPrivateUpdates: 0,
        initializedSSB: false,
        migrationProgress: 0,
        indexingProgress: 0,
        scrollHeaderBy: new Animated.Value(0),
        isDrawerOpen: false,
        canPublishSSB: true,
      };
    }
  });

  const setSelfFeedId$ = ssbSource.selfFeedId$.map(
    (selfFeedId) =>
      function setSelfFeedId(prev: State): State {
        return {...prev, selfFeedId};
      },
  );

  const aboutReducer$ = ssbSource.selfFeedId$
    .take(1)
    .map((selfFeedId) => ssbSource.profileAbout$(selfFeedId))
    .flatten()
    .map(
      (about) =>
        function aboutReducer(prev: State): State {
          return {...prev, selfAvatarUrl: about.imageUrl};
        },
    );

  const migrationProgressReducer$ = ssbSource.migrationProgress$.map(
    (migrationProgress) =>
      function migrationProgressReducer(prev: State): State {
        const canPublishSSB = migrationProgress >= 1;
        return {...prev, migrationProgress, canPublishSSB};
      },
  );

  const indexingProgressReducer$ = ssbSource.indexingProgress$.map(
    (indexingProgress) =>
      function indexingProgressReducer(prev: State): State {
        return {...prev, indexingProgress};
      },
  );

  const changeTabReducer$ = actions.changeTab$.map(
    (nextTab) =>
      function changeTabReducer(prev: State): State {
        return {...prev, currentTab: nextTab};
      },
  );

  const backToPublicTabReducer$ = actions.backToPublicTab$.map(
    () =>
      function changeTabReducer(prev: State): State {
        return {...prev, currentTab: 'public'};
      },
  );

  const isDrawerOpenReducer$ = actions.drawerToggled$.map(
    (isOpen) =>
      function isDrawerOpenReducer(prev: State): State {
        return {...prev, isDrawerOpen: isOpen};
      },
  );

  return xs.merge(
    initReducer$,
    setSelfFeedId$,
    aboutReducer$,
    migrationProgressReducer$,
    indexingProgressReducer$,
    changeTabReducer$,
    backToPublicTabReducer$,
    isDrawerOpenReducer$,
  );
}
