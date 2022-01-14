// SPDX-FileCopyrightText: 2018-2022 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import {FeedId, MsgId} from 'ssb-typescript';

export interface LocalizationLoaded {
  type: 'localizationLoaded';
}

export interface TriggerFeedCypherlink {
  type: 'triggerFeedCypherlink';
  feedId: FeedId;
}

export interface TriggerMsgCypherlink {
  type: 'triggerMsgCypherlink';
  msgId: MsgId;
}

export interface TriggerHashtagLink {
  type: 'triggerHashtagLink';
  hashtag: string;
}

export interface HardwareBackOnCentralScreen {
  type: 'hardwareBackOnCentralScreen';
}

export interface DrawerToggleOnCentralScreen {
  type: 'drawerToggleOnCentralScreen';
  open: boolean;
}

export interface HardwareBackOnContentScreen {
  type: 'hardwareBackOnContentScreen';
}

export interface DrawerToggleOnContentScreen {
  type: 'drawerToggleOnContentScreen';
  open: boolean;
}
export interface AudioBlobComposed {
  type: 'audioBlobComposed';
  blobId: string;
  ext: string;
}

export interface ApproveCheckingNewVersion {
  type: 'approveCheckingNewVersion';
}

export interface HasNewVersion {
  type: 'hasNewVersion';
}

export interface ContentChangeTab {
  subtype: 'changeTab';
  tab: 'home' | 'messages' | 'contacts' | 'discover' | 'profiles';
}

export interface ContentScrollToTop {
  subtype: 'scrollToTop';
  tab: 'home' | 'messages' | 'contacts' | 'discover' | 'profiles';
}

export interface ContentUpdateHome {
  subtype: 'homeUpdates';
  counter: number;
}

export interface ContentUpdateMessages {
  subtype: 'messagesUpdates';
  counter: number;
}

export interface ContentUpdateContacts {
  subtype: 'contactsUpdates';
  counter: number;
}

export interface ContentUpdateDiscover {
  subtype: 'discoverUpdate';
  substate: number;
}

export interface ContentUpdateProfiles {
  subtype: 'profilesUpdates';
  counter: number;
}

export type ContentScreenUpdate = {
  type: 'contentScreenUpdate';
} & (
  | ContentChangeTab
  | ContentScrollToTop
  | ContentUpdateHome
  | ContentUpdateMessages
  | ContentUpdateContacts
  | ContentUpdateDiscover
  | ContentUpdateProfiles
);

export interface MessageChangeTab {
  subtype: 'changeTab';
  tab: 'public' | 'private';
}

export interface MessageScrollToTop {
  subtype: 'scrollToTop';
  tab: 'public' | 'private';
}

export interface MessageUpdatePublic {
  subtype: 'publicUpdates';
  counter: number;
}

export interface MessageUpdatePrivate {
  subtype: 'privateUpdates';
  counter: number;
}

export type MessageScreenUpdate = {
  type: 'messageScreenUpdate';
} & (
  | MessageChangeTab
  | MessageScrollToTop
  | MessageUpdatePublic
  | MessageUpdatePrivate
);

export interface ContactChangeTab {
  subtype: 'changeTab';
  tab: 'activity' | 'connections';
}

export interface ContactScrollToTop {
  subtype: 'scrollToTop';
  tab: 'activity' | 'connections';
}

export interface ContactUpdateActivity {
  subtype: 'activityUpdates';
  counter: number;
}

export interface ContactUpdateConnections {
  subtype: 'connectionsUpdates';
  counter: number;
}

export type ContactScreenUpdate = {
  type: 'contactScreenUpdate';
} & (
  | ContactChangeTab
  | ContactScrollToTop
  | ContactUpdateActivity
  | ContactUpdateConnections
);

export type GlobalEvent =
  | LocalizationLoaded
  | TriggerFeedCypherlink
  | TriggerMsgCypherlink
  | TriggerHashtagLink
  | HardwareBackOnCentralScreen
  | DrawerToggleOnCentralScreen
  | HardwareBackOnContentScreen
  | DrawerToggleOnContentScreen
  | AudioBlobComposed
  | ContentScreenUpdate
  | MessageScreenUpdate
  | ContactScreenUpdate
  | ApproveCheckingNewVersion
  | HasNewVersion;

export class EventBus {
  public _stream?: Stream<GlobalEvent>;

  public dispatch(event: GlobalEvent) {
    if (this._stream) {
      this._stream._n(event);
    } else {
      console.error(
        'Global event bus was not prepared but dispatch was called',
      );
    }
  }
}

export const GlobalEventBus = new EventBus();

export function makeEventBusDriver() {
  const response$ = xs.create<GlobalEvent>();
  GlobalEventBus._stream = response$;

  return function eventBusDriver(
    sink$: Stream<GlobalEvent>,
  ): Stream<GlobalEvent> {
    return xs.merge(response$, sink$);
  };
}
