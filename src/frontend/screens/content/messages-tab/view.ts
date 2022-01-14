// SPDX-FileCopyrightText: 2018-2021 The Manyverse Authors
//
// SPDX-License-Identifier: MPL-2.0

import xs, {Stream} from 'xstream';
import {
  ReactElement,
  Fragment,
  PureComponent,
  Component,
  createElement as $,
} from 'react';
import {Platform, View} from 'react-native';
import {h} from '@cycle/react';
import {FloatingAction} from 'react-native-floating-action';
import {IFloatingActionProps as FabProps} from 'react-native-floating-action';
import PublicTabIcon from '../../../components/tab-buttons/PublicTabIcon';
import PrivateTabIcon from '../../../components/tab-buttons/PrivateTabIcon';
import {styles} from './styles';
import {State} from './model';

class TopBarStub extends PureComponent {
  public render() {
    return $(View, {style: styles.topBarStub}, this.props.children);
  }
}

class CurrentTabPage extends PureComponent<{
  currentTab: State['currentTab'];
  fab: FabProps;
  publicTab: ReactElement<any>;
  privateTab: ReactElement<any>;
}> {
  public render() {
    const {currentTab, fab, publicTab, privateTab} = this.props;
    const shown = styles.pageShown;
    const hidden = styles.pageHidden;

    const fabSection =
      Platform.OS === 'web'
        ? h(View, {style: styles.desktopFabContainer}, [h(FloatingAction, fab)])
        : h(FloatingAction, fab);

    return h(Fragment, [
      h(View, {style: [currentTab === 'public' ? shown : hidden]}, [
        publicTab,
        fabSection,
      ]),
      h(View, {style: [currentTab === 'private' ? shown : hidden]}, [
        privateTab,
        fabSection,
      ]),
    ]);
  }
}

class MessageTabsBar extends Component<State> {
  public shouldComponentUpdate(nextProps: MessageTabsBar['props']) {
    const prevProps = this.props;
    if (nextProps.currentTab !== prevProps.currentTab) return true;
    if (nextProps.numOfPublicUpdates !== prevProps.numOfPublicUpdates) {
      return true;
    }
    if (nextProps.numOfPrivateUpdates !== prevProps.numOfPrivateUpdates) {
      return true;
    }
    if (nextProps.initializedSSB !== prevProps.initializedSSB) {
      return true;
    }
    if (nextProps.indexingProgress !== prevProps.indexingProgress) {
      return true;
    }
    if (nextProps.migrationProgress !== prevProps.migrationProgress) {
      return true;
    }
    return false;
  }

  public render() {
    const {currentTab} = this.props;

    return h(View, {style: styles.tabBar}, [
      h(PublicTabIcon, {
        isSelected: currentTab === 'public',
        numOfUpdates: this.props.numOfPublicUpdates,
      }),
      h(PrivateTabIcon, {
        isSelected: currentTab === 'private',
        numOfUpdates: this.props.numOfPrivateUpdates,
      }),
    ]);
  }
}

export default function view(
  state$: Stream<State>,
  fabProps$: Stream<FabProps>,
  publicTab$: Stream<ReactElement<any>>,
  privateTab$: Stream<ReactElement<any>>,
) {
  return xs
    .combine(
      state$,
      fabProps$,
      publicTab$.startWith(h(View)),
      privateTab$.startWith(h(View)),
    )
    .map(([state, fabProps, publicTab, privateTab]) =>
      h(View, {style: styles.root}, [
        // h(RNBridgeDebug),
        Platform.OS === 'web' ? null : h(MessageTabsBar, state),
        h(CurrentTabPage, {
          currentTab: state.currentTab,
          fab: fabProps,
          publicTab,
          privateTab,
        }),
      ]),
    )
    .startWith($(TopBarStub));
}
