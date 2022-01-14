// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import {Reducer, Lens} from '@cycle/state';
import {Animated} from 'react-native';
import {FeedId} from 'ssb-typescript';
import {State as ActivityTabState} from './activity-tab/model';
import {State as ConnectionsTabState} from './connections-tab/model';
import {SSBSource} from '../../../drivers/ssb';

export interface State {
  selfFeedId: FeedId;
  lastSessionTimestamp: number;
  selfAvatarUrl?: string;
  currentTab: 'activity' | 'connections';
  scrollHeaderBy: Animated.Value;
  activityTab?: ActivityTabState;
  connectionsTab?: ConnectionsTabState;
  initializedSSB: boolean;
  numOfActivityUpdates: number;
  migrationProgress: number;
  indexingProgress: number;
  canPublishSSB: boolean;
  isDrawerOpen: boolean;
}

/**
 * Identity lens
 */

export const activityTabLens: Lens<State, ActivityTabState> = {
  get: (parent: State): ActivityTabState => {
    const isVisible = parent.currentTab === 'activity';
    const {selfFeedId, selfAvatarUrl} = parent;
    if (parent.activityTab) {
      return {...parent.activityTab, isVisible, selfFeedId, selfAvatarUrl};
    } else {
      return {
        isVisible,
        selfFeedId,
        selfAvatarUrl,
        lastSessionTimestamp: parent.lastSessionTimestamp,
        numOfUpdates: parent.numOfActivityUpdates,
        getActivityFeedReadable: null,
      };
    }
  },

  set: (parent: State, child: ActivityTabState): State => {
    return {
      ...parent,
      numOfActivityUpdates: child.numOfUpdates,
      activityTab: child,
    };
  },
};

export const connectionsTabLens: Lens<State, ConnectionsTabState> = {
  get: (parent: State): ConnectionsTabState => {
    const isVisible = parent.currentTab === 'connections';
    const {selfFeedId, selfAvatarUrl, initializedSSB} = parent;
    if (parent.connectionsTab) {
      return {
        ...parent.connectionsTab,
        isVisible,
        selfFeedId,
        selfAvatarUrl,
        initializedSSB,
      };
    } else {
      return {
        isVisible,
        selfFeedId,
        selfAvatarUrl,
        internetEnabled: false,
        lanEnabled: false,
        initializedSSB: parent.initializedSSB,
        postsCount: 0,
        peers: [],
        rooms: [],
        stagedPeers: [],
        status: 'bad',
        scenario: 'knows-no-one',
        bestRecommendation: null,
        otherRecommendations: '',
        timestampPeersAndRooms: 0,
        timestampStagedPeers: 0,
      };
    }
  },

  set: (parent: State, child: ConnectionsTabState): State => {
    return {
      ...parent,
      connectionsTab: child,
    };
  },
};

export interface Actions {
  changeTab$: Stream<State['currentTab']>;
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
        currentTab: 'activity',
        numOfActivityUpdates: 0,
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
    isDrawerOpenReducer$,
  );
}
